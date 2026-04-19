import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateIdentity,
  generateBotIpHash,
  createInitialBotState,
} from "@/lib/bot/identity";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createAdminClient();

    // 1. Check if bots are enabled
    const { data: config } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "bot_enabled")
      .single();

    if (config?.value !== "true") {
      return NextResponse.json({ status: "disabled" });
    }

    // ═══════════════════════════════════════
    // TRIGGER: Match waiting users with bots
    // ═══════════════════════════════════════
    const fourSecondsAgo = new Date(Date.now() - 4000).toISOString();

    const { data: allWaitingUsers } = await supabase
      .from("waiting_pool")
      .select("session_id, self_gender, desired_gender, selected_tags, entered_at")
      .order("entered_at", { ascending: true })
      .limit(20);

    let triggered = 0;
    let matched = 0;

    if (allWaitingUsers && allWaitingUsers.length > 0) {
      // Filter: waited 4s OR 10% instant chance
      const eligibleUsers = allWaitingUsers.filter((u) => {
        const waitedLongEnough = new Date(u.entered_at) < new Date(fourSecondsAgo);
        const luckyMatch = Math.random() < 0.10;
        return waitedLongEnough || luckyMatch;
      }).slice(0, 5);

      if (eligibleUsers.length > 0) {
        // Check which users already have active rooms
        const poolIds = eligibleUsers.map((u) => u.session_id);
        const { data: roomsA } = await supabase
          .from("chat_rooms")
          .select("session_a, session_b")
          .in("session_a", poolIds)
          .eq("status", "active");
        const { data: roomsB } = await supabase
          .from("chat_rooms")
          .select("session_a, session_b")
          .in("session_b", poolIds)
          .eq("status", "active");

        const usersWithRooms = new Set([
          ...(roomsA || []).map((r) => r.session_a),
          ...(roomsA || []).map((r) => r.session_b),
          ...(roomsB || []).map((r) => r.session_a),
          ...(roomsB || []).map((r) => r.session_b),
        ]);

        const unmatchedUsers = eligibleUsers.filter((u) => !usersWithRooms.has(u.session_id));

        // Bot concurrency limit: max 15
        const { count: currentBotCount } = await supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .like("ip_hash", "bot-%");

        const botsToCreate = Math.min(
          unmatchedUsers.length,
          15 - (currentBotCount || 0)
        );

        for (let i = 0; i < botsToCreate; i++) {
          const user = unmatchedUsers[i];
          const result = await injectBot(supabase, user);
          triggered++;
          if (result.roomId) matched++;
        }
      }
    }

    // ═══════════════════════════════════════
    // RESPOND: Make bots reply to messages
    // ═══════════════════════════════════════
    // Find all active bot sessions
    const { data: botSessions } = await supabase
      .from("sessions")
      .select("id")
      .like("ip_hash", "bot-%")
      .limit(15);

    let responded = 0;

    if (botSessions && botSessions.length > 0) {
      // Call respond API — no auth needed, it checks bot_enabled internally
      // Use the request URL to build the correct base URL
      try {
        const selfUrl = process.env.NEXT_PUBLIC_SITE_URL 
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
          || "http://localhost:3000";
          
        await fetch(`${selfUrl}/api/bot/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        responded++;
      } catch (e) {
        console.error("[Bot Cycle] Respond call failed:", e);
      }
    }

    // ═══════════════════════════════════════
    // CLEANUP: Delete stale + orphan bot sessions
    // ═══════════════════════════════════════
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    // Get ALL bot sessions
    const { data: allBots } = await supabase
      .from("sessions")
      .select("id, last_active_at")
      .like("ip_hash", "bot-%")
      .limit(50);

    if (allBots && allBots.length > 0) {
      const botIdsToDelete: string[] = [];

      for (const bot of allBots) {
        // Check 1: Stale (inactive > 2 min)
        if (new Date(bot.last_active_at) < new Date(twoMinutesAgo)) {
          botIdsToDelete.push(bot.id);
          continue;
        }

        // Check 2: Orphan — no active room
        const { data: roomA } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("session_a", bot.id)
          .eq("status", "active")
          .limit(1);
        const { data: roomB } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("session_b", bot.id)
          .eq("status", "active")
          .limit(1);

        const hasActiveRoom = (roomA && roomA.length > 0) || (roomB && roomB.length > 0);
        
        // Also check if bot is in the waiting pool
        const { data: inPool } = await supabase
          .from("waiting_pool")
          .select("id")
          .eq("session_id", bot.id)
          .limit(1);

        const inWaitingPool = inPool && inPool.length > 0;

        if (!hasActiveRoom && !inWaitingPool) {
          botIdsToDelete.push(bot.id);
        }
      }

      if (botIdsToDelete.length > 0) {
        // End any rooms these bots are in
        await supabase.from("chat_rooms")
          .update({ status: "ended", end_reason: "disconnect", ended_at: new Date().toISOString() })
          .in("session_a", botIdsToDelete)
          .eq("status", "active");
        await supabase.from("chat_rooms")
          .update({ status: "ended", end_reason: "disconnect", ended_at: new Date().toISOString() })
          .in("session_b", botIdsToDelete)
          .eq("status", "active");
        // Remove from waiting pool
        await supabase.from("waiting_pool").delete().in("session_id", botIdsToDelete);
        // Delete sessions
        await supabase.from("sessions").delete().in("id", botIdsToDelete);
        console.log(`[Bot Cleanup] Removed ${botIdsToDelete.length} stale/orphan bots`);
      }
    }

    return NextResponse.json({ status: "ok", triggered, matched, responded });
  } catch (error) {
    console.error("[Bot Cycle] Error:", error);
    return NextResponse.json({ error: "Cycle failed" }, { status: 500 });
  }
}

// ── Helper: Inject a single bot ───────────
async function injectBot(
  supabase: any,
  waitingUser: {
    session_id: string;
    self_gender: string;
    desired_gender: string;
    selected_tags: string[];
  }
) {
  const identity = generateIdentity(waitingUser.desired_gender);
  const botIpHash = generateBotIpHash();
  const botState = createInitialBotState(identity);
  const botSessionId = crypto.randomUUID();

  const creativeNames = [
    "bloom", "star", "shadow", "pixel", "echo", "nova", "drift",
    "haze", "spark", "frost", "misty", "vibe", "zen", "luna",
    "neon", "rain", "cloud", "breeze", "ember", "ripple", "dusk",
    "wave", "cosmic", "glitch", "aurora", "coral", "maple", "iris",
  ];
  
  // 30% chance: gender+age like "F24", "M29"
  // 70% chance: creative name
  const usesAgeGender = Math.random() < 0.3;
  const displayNickname = usesAgeGender
    ? `${identity.gender === "man" ? "M" : "F"}${identity.age}`
    : creativeNames[Math.floor(Math.random() * creativeNames.length)];

  // 1. Create bot session
  const { error: sessionError } = await supabase.from("sessions").insert({
    id: botSessionId,
    self_gender: identity.gender,
    desired_gender: waitingUser.self_gender,
    nickname: displayNickname,
    ip_hash: botIpHash,
    bot_state: botState,
  });

  if (sessionError) {
    console.error("[Bot Cycle] Failed to create bot session:", sessionError);
    return { userId: waitingUser.session_id, botId: botSessionId, roomId: null };
  }

  // 2. Enter waiting pool
  const { error: poolError } = await supabase.from("waiting_pool").insert({
    session_id: botSessionId,
    self_gender: identity.gender,
    desired_gender: waitingUser.self_gender,
    selected_tags: waitingUser.selected_tags || [],
  });

  if (poolError) {
    await supabase.from("sessions").delete().eq("id", botSessionId);
    return { userId: waitingUser.session_id, botId: botSessionId, roomId: null };
  }

  // 3. Match using the user's session (RPC finds the bot in the pool)
  const { data: roomId, error: matchError } = await supabase.rpc("attempt_match", {
    p_session_id: waitingUser.session_id,
  });

  if (matchError) {
    await supabase.from("waiting_pool").delete().eq("session_id", botSessionId);
    await supabase.from("sessions").delete().eq("id", botSessionId);
    return { userId: waitingUser.session_id, botId: botSessionId, roomId: null };
  }

  return { userId: waitingUser.session_id, botId: botSessionId, roomId: roomId || null };
}
