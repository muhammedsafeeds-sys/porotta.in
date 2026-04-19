// ═══════════════════════════════════════════
// Bot Trigger API — POST /api/bot/trigger
// ═══════════════════════════════════════════
// Checks waiting_pool for lonely users and injects a bot match.
// Called periodically by the scheduler (every 5 seconds).

import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import {
  generateIdentity,
  generateBotIpHash,
  createInitialBotState,
} from "@/lib/bot/identity";

export const dynamic = "force-dynamic";

// Bot secret to prevent unauthorized calls
const BOT_SECRET = process.env.BOT_SECRET || process.env.ADMIN_PASSWORD || "bot-dev-secret";

export async function POST(request: Request) {
  // ── Auth check ─────────────────────────
  try {
    const body = await request.json().catch(() => ({}));
    const secret = body.secret || "";
    if (secret !== BOT_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // ── 1. Check global toggle ─────────────
    const { data: config } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "bot_enabled")
      .single();

    if (!config || config.value !== "true") {
      return Response.json({ status: "disabled", message: "Bot system is disabled" });
    }

    // ── 2. Find users waiting > 10 seconds ──
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();

    const { data: waitingUsers, error: waitError } = await supabase
      .from("waiting_pool")
      .select("session_id, self_gender, desired_gender, selected_tags, entered_at")
      .lt("entered_at", tenSecondsAgo)
      .order("entered_at", { ascending: true })
      .limit(5); // Process max 5 at a time

    if (waitError) {
      console.error("[Bot Trigger] Error querying waiting_pool:", waitError);
      return Response.json({ error: "DB query failed" }, { status: 500 });
    }

    if (!waitingUsers || waitingUsers.length === 0) {
      return Response.json({ status: "ok", triggered: 0, message: "No users waiting long enough" });
    }

    // ── 3. Filter out users already matched ──
    const poolSessionIds = waitingUsers.map((w: any) => w.session_id);
    
    const { data: activeRooms } = await supabase
      .from("chat_rooms")
      .select("session_a, session_b")
      .in("session_a", poolSessionIds)
      .eq("status", "active");
    
    const { data: activeRoomsB } = await supabase
      .from("chat_rooms")
      .select("session_a, session_b")
      .in("session_b", poolSessionIds)
      .eq("status", "active");

    // ── 3.5 Storage Cleanup (Free Tier Maintenance) ──
    // Delete bots and their ended rooms that haven't been active in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: staleBotSessions } = await supabase
      .from("sessions")
      .select("id")
      .like("ip_hash", "bot-%")
      .lt("last_active_at", twoMinutesAgo)
      .limit(50);

    if (staleBotSessions && staleBotSessions.length > 0) {
      const staleIds = staleBotSessions.map(s => s.id);
      await supabase.from("sessions").delete().in("id", staleIds);
      console.log(`[Bot Cleanup] Deleted ${staleIds.length} stale bot sessions to save space.`);
    }

    // ── 3.6 Bot Concurrency Limit ──
    // Prevent creating new bots if we already have 15 active
    const { count: currentBotCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .like("ip_hash", "bot-%");

    if (currentBotCount !== null && currentBotCount >= 15) {
      return Response.json({ status: "max_bots_reached", matched: 0 });
    }

    const usersWithRooms = new Set([
      ...(activeRooms || []).map((r) => r.session_a),
      ...(activeRooms || []).map((r) => r.session_b),
      ...(activeRoomsB || []).map((r) => r.session_a),
      ...(activeRoomsB || []).map((r) => r.session_b),
    ]);

    const eligibleUsers = waitingUsers.filter(
      (u) => !usersWithRooms.has(u.session_id)
    );

    if (eligibleUsers.length === 0) {
      return Response.json({ status: "ok", triggered: 0, message: "All waiting users already matched" });
    }

    // ── 4. Limit concurrent bots ────────────
    // Check how many bots are currently active
    const { count: activeBotCount } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .like("ip_hash", "bot-%");

    const MAX_CONCURRENT_BOTS = 10;
    const botsToCreate = Math.min(
      eligibleUsers.length,
      MAX_CONCURRENT_BOTS - (activeBotCount || 0)
    );

    if (botsToCreate <= 0) {
      return Response.json({ status: "ok", triggered: 0, message: "Max concurrent bots reached" });
    }

    // ── 5. Create bot sessions and match ────
    const results: Array<{ userId: string; botId: string; roomId: string | null }> = [];

    for (let i = 0; i < botsToCreate; i++) {
      const user = eligibleUsers[i];
      const result = await injectBot(supabase, user);
      results.push(result);
    }

    const matched = results.filter((r) => r.roomId !== null);
    console.log(
      `[Bot Trigger] Created ${results.length} bots, matched ${matched.length}`
    );

    return Response.json({
      status: "ok",
      triggered: results.length,
      matched: matched.length,
      details: results,
    });
  } catch (error) {
    console.error("[Bot Trigger] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helper: Inject a single bot ───────────
async function injectBot(
  supabase: AdminClient,
  waitingUser: {
    session_id: string;
    self_gender: string;
    desired_gender: string;
    selected_tags: string[];
  }
) {
  // Generate identity compatible with what the user wants
  const identity = generateIdentity(waitingUser.desired_gender);
  const botIpHash = generateBotIpHash();
  const botState = createInitialBotState(identity);
  const botSessionId = crypto.randomUUID();

  // Create an anonymous display name
  const anonNames = ["Stranger", "Dreamer", "Guest", "Anonymous"];
  const useAgeGender = Math.random() > 0.5;
  const displayNickname = useAgeGender 
    ? `${identity.gender === "man" ? "M" : "F"}${identity.age}` 
    : anonNames[Math.floor(Math.random() * anonNames.length)];

  // 1. Create a real session row for the bot
  const { error: sessionError } = await supabase.from("sessions").insert({
    id: botSessionId,
    self_gender: identity.gender,
    desired_gender: waitingUser.self_gender, // Bot wants to talk to the user's gender
    nickname: displayNickname,
    ip_hash: botIpHash,
    bot_state: botState, // Store bot identity + state here
  });

  if (sessionError) {
    console.error("[Bot Trigger] Failed to create bot session:", sessionError);
    return { userId: waitingUser.session_id, botId: botSessionId, roomId: null };
  }

  // 2. Enter the waiting pool
  const { error: poolError } = await supabase.from("waiting_pool").insert({
    session_id: botSessionId,
    self_gender: identity.gender,
    desired_gender: waitingUser.self_gender,
    selected_tags: waitingUser.selected_tags || [],
  });

  if (poolError) {
    console.error("[Bot Trigger] Failed to enter bot in pool:", poolError);
    // Cleanup the session
    await supabase.from("sessions").delete().eq("id", botSessionId);
    return { userId: waitingUser.session_id, botId: botSessionId, roomId: null };
  }

  // 3. Call attempt_match from the USER's side (not the bot)
  // This way the existing RPC finds the bot in the pool and matches them
  const { data: roomId, error: matchError } = await supabase.rpc("attempt_match", {
    p_session_id: waitingUser.session_id,
  });

  if (matchError) {
    console.error("[Bot Trigger] Match RPC failed:", matchError);
    // Cleanup
    await supabase.from("waiting_pool").delete().eq("session_id", botSessionId);
    await supabase.from("sessions").delete().eq("id", botSessionId);
    return { userId: waitingUser.session_id, botId: botSessionId, roomId: null };
  }

  if (!roomId) {
    // Match didn't happen — maybe another user grabbed the bot or the user left
    // Clean up the bot from the pool (it'll be cleaned up on next trigger if still there)
    console.log("[Bot Trigger] No match — another user may have matched first");
  }

  return { userId: waitingUser.session_id, botId: botSessionId, roomId: roomId || null };
}
