// ═══════════════════════════════════════════
// Bot Toggle API — POST /api/bot/toggle
// ═══════════════════════════════════════════
// Enables or disables the bot system globally.

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return Response.json({ error: "Missing 'enabled' boolean" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Upsert the config value
    const { error } = await supabase
      .from("system_config")
      .upsert(
        {
          key: "bot_enabled",
          value: enabled ? "true" : "false",
          description: "Enable/disable AI chat bots",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error("[Bot Toggle] Error:", error);
      return Response.json({ error: "Failed to update config" }, { status: 500 });
    }

    // If disabling, optionally clean up active bots
    if (!enabled) {
      // End all active bot rooms
      const { data: botSessions } = await supabase
        .from("sessions")
        .select("id")
        .like("ip_hash", "bot-%");

      if (botSessions && botSessions.length > 0) {
        const botIds = botSessions.map((s) => s.id);

        // End rooms where bot is session_a
        await supabase
          .from("chat_rooms")
          .update({
            status: "ended",
            end_reason: "disconnect",
            ended_at: new Date().toISOString(),
          })
          .in("session_a", botIds)
          .eq("status", "active");

        // End rooms where bot is session_b
        await supabase
          .from("chat_rooms")
          .update({
            status: "ended",
            end_reason: "disconnect",
            ended_at: new Date().toISOString(),
          })
          .in("session_b", botIds)
          .eq("status", "active");

        // Remove bots from waiting pool
        await supabase
          .from("waiting_pool")
          .delete()
          .in("session_id", botIds);

        // Delete bot sessions
        await supabase
          .from("sessions")
          .delete()
          .in("id", botIds);
      }
    }

    return Response.json({ status: "ok", enabled });
  } catch (error) {
    console.error("[Bot Toggle] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
