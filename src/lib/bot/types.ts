// ═══════════════════════════════════════════
// Bot System — Type Definitions
// ═══════════════════════════════════════════

export type BotPersonality = "shy" | "sarcastic" | "curious" | "talkative";
export type BotMood = "default" | "bored" | "curious" | "distracted";
export type BotGender = "man" | "woman";

export interface BotIdentity {
  name: string;
  age: number;
  city: string;
  gender: BotGender;
  personality: BotPersonality;
}

export interface BotState {
  is_bot: true;
  identity: BotIdentity;
  message_count: number;
  mood: BotMood;
  mood_shifted_at: number | null;
  last_responded_msg_id: string | null;
  respond_after: string | null; // ISO timestamp — when the bot should respond
  exit_at_message: number; // random 15–25
  exit_phase: "none" | "hinting" | "farewell" | "ended";
  conversation_context: string[]; // last few bot responses for continuity
}

export interface BotSessionData {
  is_bot: true;
  identity: BotIdentity;
  state: Omit<BotState, "is_bot" | "identity">;
}

export interface BotRoom {
  room_id: string;
  bot_session_id: string;
  human_session_id: string;
  bot_data: BotSessionData;
}

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}
