import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { roomId, sessionId, message } = await req.json();
    
    if (!message || message.trim().length === 0) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const supabase = createClient();
    
    const { error } = await supabase.from("feedback").insert({
      room_id: roomId,
      session_id: sessionId,
      message: message.trim()
    });

    if (error) {
      console.error("[Feedback API] Error inserting feedback:", error);
      return Response.json({ error: "Failed to submit feedback" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("[Feedback API] Unexpected error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
