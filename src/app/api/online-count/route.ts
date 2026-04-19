import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // 1. Get bot config
    const { data: config } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "bot_enabled")
      .single();
      
    const isBotEnabled = config?.value === "true";

    // 2. Get real count from waiting_pool and active chat rooms
    const { count: poolCount } = await supabase
      .from("waiting_pool")
      .select("*", { count: "exact", head: true });
      
    const { count: activeRooms } = await supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
      
    let finalCount = (poolCount || 0) + ((activeRooms || 0) * 2);
    
    if (isBotEnabled) {
      const timeSeed = Math.floor(Date.now() / 60000); 
      finalCount += 100 + (timeSeed % 50); 
    }

    return NextResponse.json({ count: finalCount }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (err) {
    console.error("[Online Count API Error]", err);
    return NextResponse.json({ count: 0 });
  }
}
