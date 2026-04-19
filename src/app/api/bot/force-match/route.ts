import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateIdentity,
  generateBotIpHash,
  createInitialBotState,
} from "@/lib/bot/identity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "No session ID provided" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Find user in pool
    const { data: waitingUser } = await supabase
      .from("waiting_pool")
      .select("session_id, self_gender, desired_gender, selected_tags")
      .eq("session_id", sessionId)
      .single();

    if (!waitingUser) {
      // Maybe already matched!
      return NextResponse.json({ status: "already_matched_or_missing" });
    }

    // 2. Check if they already have an active room
    const { data: existingRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .or(`session_a.eq.${sessionId},session_b.eq.${sessionId}`)
      .eq("status", "active")
      .limit(1)
      .single();

    if (existingRoom) {
      return NextResponse.json({ status: "already_in_room", roomId: existingRoom.id });
    }

    // 3. Inject a single bot exclusively for this user
    const identity = generateIdentity(waitingUser.desired_gender);
    const botIpHash = generateBotIpHash();
    const botState = createInitialBotState(identity);
    const botSessionId = crypto.randomUUID();

    const creativeNames = [
      "bloom", "star", "shadow", "pixel", "echo", "nova", "drift",
      "haze", "spark", "frost", "misty", "vibe", "zen", "luna",
    ];
    const usesAgeGender = Math.random() < 0.3;
    const displayNickname = usesAgeGender
      ? `${identity.gender === "man" ? "M" : "F"}${identity.age}`
      : creativeNames[Math.floor(Math.random() * creativeNames.length)];

    await supabase.from("sessions").insert({
      id: botSessionId,
      self_gender: identity.gender,
      desired_gender: waitingUser.self_gender,
      nickname: displayNickname,
      ip_hash: botIpHash,
      bot_state: botState,
    });

    await supabase.from("waiting_pool").insert({
      session_id: botSessionId,
      self_gender: identity.gender,
      desired_gender: waitingUser.self_gender,
      selected_tags: waitingUser.selected_tags || [],
    });

    // 4. Force the match RPC
    const { data: roomId, error: matchError } = await supabase.rpc("attempt_match", {
      p_session_id: sessionId,
    });

    if (matchError || !roomId) {
      // Clean up if it failed
      await supabase.from("waiting_pool").delete().eq("session_id", botSessionId);
      await supabase.from("sessions").delete().eq("id", botSessionId);
      return NextResponse.json({ error: "Match failed" }, { status: 500 });
    }

    return NextResponse.json({ status: "matched", roomId });

  } catch (err) {
    console.error("[Bot Force Match] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
