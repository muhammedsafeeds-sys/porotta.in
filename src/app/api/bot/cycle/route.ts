import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    const baseUrl = request.headers.get("origin") || "http://localhost:3000";
    const secret = process.env.BOT_SECRET || "Safeed3030";

    // 2. Trigger bots (matches waiting users)
    const triggerRes = await fetch(`${baseUrl}/api/bot/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    }).catch(() => null);

    // 3. Respond bots (replies to active chats)
    const respondRes = await fetch(`${baseUrl}/api/bot/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    }).catch(() => null);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json({ error: "Cycle failed" }, { status: 500 });
  }
}
