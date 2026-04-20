// ═══════════════════════════════════════════
// Bot Respond API — POST /api/bot/respond
// ═══════════════════════════════════════════
// Checks active bot rooms for new human messages and generates responses.
// Called periodically by the scheduler (every 3–5 seconds).

import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { generateResponse } from "@/lib/bot/gemini";
import { buildSystemPrompt, buildMessageHistory } from "@/lib/bot/prompts";
import {
  calculateTypingDelay,
  checkMoodDrift,
  humanizeText,
  getExitAction,
  checkBotDetection,
} from "@/lib/bot/behavior";
import type { BotSessionData } from "@/lib/bot/types";

export const dynamic = "force-dynamic";

export async function POST() {

  try {
    const supabase = createAdminClient();

    // ── 1. Check global toggle ─────────────
    const { data: config } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "bot_enabled")
      .single();

    if (!config || config.value !== "true") {
      return Response.json({ status: "disabled" });
    }

    // ── 2. Find all active bot sessions ────
    const { data: botSessions, error: sessError } = await supabase
      .from("sessions")
      .select("id, bot_state")
      .like("ip_hash", "bot-%");

    if (sessError || !botSessions || botSessions.length === 0) {
      return Response.json({ status: "ok", processed: 0 });
    }

    // ── 3. Find active rooms with these bots ──
    const botIds = botSessions.map((s: any) => s.id);

    const { data: roomsA } = await supabase
      .from("chat_rooms")
      .select("id, session_a, session_b")
      .in("session_a", botIds)
      .eq("status", "active");

    const { data: roomsB } = await supabase
      .from("chat_rooms")
      .select("id, session_a, session_b")
      .in("session_b", botIds)
      .eq("status", "active");

    const allRooms = [...(roomsA || []), ...(roomsB || [])];

    if (allRooms.length === 0) {
      return Response.json({ status: "ok", processed: 0 });
    }

    // Build a map of bot session data
    const botDataMap = new Map<string, BotSessionData>();
    for (const session of botSessions) {
      if (session.bot_state?.is_bot) {
        botDataMap.set(session.id, session.bot_state as BotSessionData);
      }
    }

    // ── 4. Process each room ────────────────
    const results: Array<{ roomId: string; action: string }> = [];

    for (const room of allRooms) {
      const botSessionId = botIds.includes(room.session_a)
        ? room.session_a
        : room.session_b;
      const humanSessionId =
        botSessionId === room.session_a ? room.session_b : room.session_a;

      const botData = botDataMap.get(botSessionId);
      if (!botData) continue;

      const result = await processRoom(
        supabase,
        room.id,
        botSessionId,
        humanSessionId,
        botData
      );
      results.push({ roomId: room.id, action: result });
    }

    return Response.json({
      status: "ok",
      processed: results.length,
      details: results,
    });
  } catch (error) {
    console.error("[Bot Respond] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════
// Room Processing Logic
// ═══════════════════════════════════════════

async function processRoom(
  supabase: AdminClient,
  roomId: string,
  botSessionId: string,
  humanSessionId: string,
  botData: BotSessionData
): Promise<string> {
  const { identity, state } = botData;

  // ── Check if bot should exit ────────────
  if (state.exit_phase === "ended") {
    // End the conversation
    await supabase
      .from("chat_rooms")
      .update({
        status: "ended",
        end_reason: "user_end",
        ended_by: botSessionId,
        ended_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    // Clean up bot session
    await supabase.from("sessions").delete().eq("id", botSessionId);

    return "ended_conversation";
  }

  // ── Get recent messages ─────────────────
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id, sender_session, content, sent_at")
    .eq("room_id", roomId)
    .order("sent_at", { ascending: true })
    .limit(20);

  if (msgError) {
    console.error(`[Bot Respond] Error fetching messages for room ${roomId}:`, msgError);
    return "error";
  }

  if (!messages || messages.length === 0) {
    // No messages yet — send a greeting after a delay
    if (state.respond_after === null) {
      const greetDelay = 2000 + Math.random() * 3000; // 2–5 seconds
      const respondAt = new Date(Date.now() + greetDelay).toISOString();
      await updateBotState(supabase, botSessionId, botData, {
        respond_after: respondAt,
      });
      return "scheduled_greeting";
    }

    if (new Date(state.respond_after) > new Date()) {
      return "waiting_to_greet";
    }

    // Time to send greeting
    const greetings = [
      "hey", "hii", "hello", "hey there", "hii!",
      "heyyy", "hi!", "yo", "heyy whats up",
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    await sendBotMessage(supabase, roomId, botSessionId, greeting);
    await updateBotState(supabase, botSessionId, botData, {
      message_count: 1,
      respond_after: null,
      conversation_context: [greeting],
    });

    return "sent_greeting";
  }

  // ── Check if the last message is from the human ──
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.sender_session === botSessionId) {
    // Last message is from the bot — nothing to do
    return "waiting_for_human";
  }

  // ── Check if we already responded to this message ──
  if (state.last_responded_msg_id === lastMessage.id) {
    return "already_responded";
  }

  // ── Schedule response with typing delay ──
  if (state.respond_after === null) {
    // First time seeing this message — calculate delay and schedule
    const deflection = checkBotDetection(lastMessage.content);
    const previewResponse = deflection || "placeholder for delay calc";
    const delay = calculateTypingDelay(previewResponse, state.mood as any);
    const respondAt = new Date(Date.now() + delay).toISOString();

    await updateBotState(supabase, botSessionId, botData, {
      respond_after: respondAt,
    });

    return `scheduled_response_in_${delay}ms`;
  }

  // ── Check if it's time to respond ───────
  if (new Date(state.respond_after) > new Date()) {
    return "waiting_to_respond";
  }

  // ── Time to generate and send response ──
  const newMessageCount = state.message_count + 1;

  // Check exit strategy
  const exitAction = getExitAction(botData);

  // Check if we hit the natural chat length limit (20-25 messages)
  const maxMessages = 20 + (parseInt(botSessionId.replace(/\D/g, "") || "0", 10) % 6); // Pseudo-random 20-25 based on ID
  if (newMessageCount > maxMessages) {
    // Force exit to keep chats moving organically
    exitAction.message = "[END_CHAT]";
  }

  // Check mood drift
  const newMood = checkMoodDrift(
    newMessageCount,
    state.mood as any,
    state.mood_shifted_at
  );

  const currentMood = newMood || (state.mood as any);

  // Check for bot detection
  const deflection = checkBotDetection(lastMessage.content);

  let responseText: string;

  if (deflection) {
    // Bot detection — use canned deflection
    responseText = deflection;
  } else if (exitAction.message) {
    // Exit phase — use exit message
    responseText = exitAction.message;
  } else {
    // Normal response — call Gemini
    const systemPrompt = buildSystemPrompt(identity, currentMood, state.exit_phase as any);
    const history = buildMessageHistory(messages, botSessionId, 8);

    responseText = await generateResponse(systemPrompt, history);

    if (responseText.includes("[END_CHAT]")) {
      // The AI detected inappropriate content and decided to end the chat
      await supabase
        .from("chat_rooms")
        .update({
          status: "ended",
          end_reason: "user_end", // Makes it look like the "user" disconnected
          ended_by: botSessionId,
          ended_at: new Date().toISOString(),
        })
        .eq("id", roomId);

      await supabase.from("sessions").delete().eq("id", botSessionId);
      return "ended_due_to_inappropriate_content";
    }

    // Apply human-like mutations
    responseText = humanizeText(responseText, identity.personality, currentMood);
  }

  // ── Send the message ────────────────────
  await sendBotMessage(supabase, roomId, botSessionId, responseText);

  // ── Update bot state ────────────────────
  const contextHistory = [...state.conversation_context, responseText].slice(-5);

  await updateBotState(supabase, botSessionId, botData, {
    message_count: newMessageCount,
    mood: currentMood,
    mood_shifted_at: newMood ? newMessageCount : state.mood_shifted_at,
    last_responded_msg_id: lastMessage.id,
    respond_after: null,
    exit_phase: exitAction.newPhase,
    conversation_context: contextHistory,
  });

  return `sent_response_#${newMessageCount}`;
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

async function sendBotMessage(
  supabase: AdminClient,
  roomId: string,
  botSessionId: string,
  content: string
) {
  const { error } = await supabase.from("messages").insert({
    id: crypto.randomUUID(),
    room_id: roomId,
    sender_session: botSessionId,
    content: content.slice(0, 500), // Enforce max length
  });

  if (error) {
    console.error(`[Bot Respond] Failed to send message in room ${roomId}:`, error);
  }
}

async function updateBotState(
  supabase: AdminClient,
  botSessionId: string,
  currentData: BotSessionData,
  stateUpdates: Partial<BotSessionData["state"]>
) {
  const updatedData: BotSessionData = {
    ...currentData,
    state: {
      ...currentData.state,
      ...stateUpdates,
    },
  };

  const { error } = await supabase
    .from("sessions")
    .update({
      bot_state: updatedData,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", botSessionId);

  if (error) {
    console.error(`[Bot Respond] Failed to update bot state for ${botSessionId}:`, error);
  }
}
