// ═══════════════════════════════════════════
// Bot Status API — GET /api/bot/status
// ═══════════════════════════════════════════
// Returns current bot system status for the admin panel.

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Bot enabled status
    const { data: config } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "bot_enabled")
      .single();

    const botEnabled = config?.value === "true";

    // 2. Active bot count
    const { count: activeBots } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .like("ip_hash", "bot-%");

    // 3. Active bot rooms
    const { data: botSessions } = await supabase
      .from("sessions")
      .select("id")
      .like("ip_hash", "bot-%");

    let activeRooms = 0;
    if (botSessions && botSessions.length > 0) {
      const botIds = botSessions.map((s) => s.id);

      const { count: roomsA } = await supabase
        .from("chat_rooms")
        .select("id", { count: "exact", head: true })
        .in("session_a", botIds)
        .eq("status", "active");

      const { count: roomsB } = await supabase
        .from("chat_rooms")
        .select("id", { count: "exact", head: true })
        .in("session_b", botIds)
        .eq("status", "active");

      activeRooms = (roomsA || 0) + (roomsB || 0);
    }

    // 4. Users in queue
    const { count: queueCount } = await supabase
      .from("waiting_pool")
      .select("id", { count: "exact", head: true });

    // 5. Bot session details
    const { data: botDetails } = await supabase
      .from("sessions")
      .select("id, nickname, self_gender, bot_state, last_active_at")
      .like("ip_hash", "bot-%")
      .order("last_active_at", { ascending: false })
      .limit(20);

    const botInfo = (botDetails || []).map((s) => {
      const flags = s.bot_state as any;
      return {
        id: s.id.slice(0, 8),
        name: s.nickname || "Unknown",
        gender: s.self_gender,
        personality: flags?.identity?.personality || "unknown",
        city: flags?.identity?.city || "unknown",
        messageCount: flags?.state?.message_count || 0,
        mood: flags?.state?.mood || "default",
        exitPhase: flags?.state?.exit_phase || "none",
        lastActive: s.last_active_at,
      };
    });

    return Response.json({
      enabled: botEnabled,
      activeBots: activeBots || 0,
      activeRooms,
      queueCount: queueCount || 0,
      bots: botInfo,
    });
  } catch (error) {
    console.error("[Bot Status] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
