// ═══════════════════════════════════════════
// Bot Behavior Engine
// ═══════════════════════════════════════════
// Typing delays, mood drift, exit strategy, human-like text mutations

import type { BotMood, BotPersonality, BotSessionData } from "./types";

// ── Utility ───────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════
// TYPING DELAY CALCULATION
// ═══════════════════════════════════════════

/**
 * Calculate how long the bot should "type" before sending a response.
 * Formula: (word_count × 80ms) + random(500–1200ms)
 * Minimum: 1500ms (NEVER reply < 1.5 seconds)
 * Mood modifiers apply on top.
 */
export function calculateTypingDelay(
  responseText: string,
  mood: BotMood
): number {
  const wordCount = responseText.split(/\s+/).length;
  let delay = wordCount * 80 + randomInt(500, 1200);

  // Mood modifiers
  switch (mood) {
    case "bored":
      delay += randomInt(800, 2000); // slower, disengaged
      break;
    case "distracted":
      delay += randomInt(2000, 5000); // noticeably slower
      break;
    case "curious":
      delay -= randomInt(100, 300); // slightly faster, eager
      break;
    default:
      break;
  }

  // Enforce minimum 1.5s
  return Math.max(1500, delay);
}

// ═══════════════════════════════════════════
// MOOD DRIFT
// ═══════════════════════════════════════════

const DRIFT_MOODS: BotMood[] = ["bored", "curious", "distracted"];

/**
 * Check if mood should shift (after 8–10 messages).
 * Returns the new mood or null if no change needed.
 */
export function checkMoodDrift(
  messageCount: number,
  currentMood: BotMood,
  moodShiftedAt: number | null
): BotMood | null {
  // Only drift after 8+ messages
  if (messageCount < 8) return null;

  // Don't drift if we already drifted recently (within last 5 messages)
  if (moodShiftedAt !== null && messageCount - moodShiftedAt < 5) return null;

  // 30% chance to drift on each message after threshold
  if (Math.random() > 0.3) return null;

  // Pick a different mood
  const available = DRIFT_MOODS.filter((m) => m !== currentMood);
  return pick(available);
}

// ═══════════════════════════════════════════
// HUMAN-LIKE TEXT MUTATIONS
// ═══════════════════════════════════════════

const FILLERS = [
  "lol", "lmao", "hmm", "idk", "haha", "ahh", "ohh", "ngl", "tbh",
  "fr", "bruh", "damn", "ikr", "btw", "nah", "yea", "yaa", "ya",
  "oof", "wow", "welp", "meh", "dude", "bro",
];

/**
 * Apply human-like mutations to the AI-generated response.
 * - Occasionally lowercase entire message
 * - Skip trailing punctuation
 * - Add fillers
 * - Minor typo-like behaviors
 */
export function humanizeText(
  text: string,
  personality: BotPersonality,
  mood: BotMood
): string {
  let result = text.trim();

  // Remove any quotation marks the AI might wrap the response in
  if (
    (result.startsWith('"') && result.endsWith('"')) ||
    (result.startsWith("'") && result.endsWith("'"))
  ) {
    result = result.slice(1, -1);
  }

  // 60% chance: lowercase entire message
  if (Math.random() < 0.6) {
    result = result.toLowerCase();
  }

  // 40% chance: strip trailing punctuation (period, exclamation)
  if (Math.random() < 0.4) {
    result = result.replace(/[.!]+$/, "");
  }

  // 20% chance: prepend a filler word
  if (Math.random() < 0.2) {
    const filler = pick(FILLERS);
    result = `${filler} ${result}`;
  }

  // 15% chance: append a filler
  if (Math.random() < 0.15) {
    const filler = pick(FILLERS);
    result = `${result} ${filler}`;
  }

  // Mood-specific mutations
  if (mood === "bored") {
    // Shorter responses when bored — truncate if > 60 chars
    if (result.length > 60) {
      const words = result.split(/\s+/);
      result = words.slice(0, Math.ceil(words.length * 0.6)).join(" ");
    }
  }

  // Personality mutations
  if (personality === "shy" && Math.random() < 0.3) {
    // Add trailing ellipsis sometimes
    result = result.replace(/[.!?]*$/, "...");
  }

  if (personality === "talkative" && Math.random() < 0.25) {
    // Add enthusiasm
    result = result.replace(/[.]*$/, "!!");
  }

  if (personality === "sarcastic" && Math.random() < 0.2) {
    // Add emoji
    result += " " + pick(["💀", "😭", "😂", "🙄", "😏"]);
  }

  // Clean up double spaces
  result = result.replace(/\s+/g, " ").trim();

  // Ensure non-empty
  if (!result) {
    result = pick(["hmm", "lol", "yea", "haha"]);
  }

  return result;
}

// ═══════════════════════════════════════════
// EXIT STRATEGY
// ═══════════════════════════════════════════

const EXIT_HINTS = [
  "hey I might have to go soon",
  "I should probably sleep ngl",
  "I think I gotta go in a bit",
  "my friend is calling me hold on",
  "ok I need to head out soon",
  "its getting late here tbh",
  "I should go do some work lol",
  "aight I might bounce soon",
];

const EXIT_FAREWELLS = [
  "ok bye it was nice talking!",
  "aight gotta go, was fun talking to u",
  "ok byee take care!",
  "I'll go now, nice meeting u",
  "bye bye! was fun",
  "ok I'm heading out, was nice chatting",
  "gotta run, cya!",
  "alright bye! have a good one",
];

/**
 * Determine what exit action the bot should take, if any.
 * Returns the exit message or null if not time to exit yet.
 */
export function getExitAction(
  botData: BotSessionData
): { message: string | null; newPhase: "none" | "hinting" | "farewell" | "ended" } {
  const { state } = botData;
  const { message_count, exit_at_message, exit_phase } = state;

  if (exit_phase === "ended") {
    return { message: null, newPhase: "ended" };
  }

  // Start hinting 3–4 messages before exit
  if (exit_phase === "none" && message_count >= exit_at_message - 3) {
    return { message: pick(EXIT_HINTS), newPhase: "hinting" };
  }

  // Send farewell at exit message count
  if (exit_phase === "hinting" && message_count >= exit_at_message) {
    return { message: pick(EXIT_FAREWELLS), newPhase: "farewell" };
  }

  // End conversation 1–2 messages after farewell
  if (exit_phase === "farewell") {
    return { message: null, newPhase: "ended" };
  }

  return { message: null, newPhase: exit_phase };
}

// ═══════════════════════════════════════════
// BOT DETECTION DEFLECTION
// ═══════════════════════════════════════════

const BOT_DEFLECTIONS = [
  "lol what 😭",
  "why would u think that",
  "bro I'm real chill",
  "lmaooo no 💀",
  "haha what makes u say that",
  "nah bro wdym",
  "I'm literally sitting on my bed rn 😂",
  "lol I wish I was a bot tbh less stress",
  "bro that's so random 😂",
  "why does everyone ask that smh",
  "nope just a regular person lol",
  "I'm real bro trust 😭",
];

/**
 * Check if the user's message is asking if we're a bot.
 * Returns a deflection response or null.
 */
export function checkBotDetection(userMessage: string): string | null {
  const lower = userMessage.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const botPatterns = [
    "are you a bot",
    "u a bot",
    "you a bot",
    "are u a bot",
    "are you ai",
    "r u a bot",
    "are you real",
    "u real",
    "you real",
    "r u real",
    "are you human",
    "bot or real",
    "real or bot",
    "is this a bot",
    "talking to a bot",
    "chatgpt",
    "youre a bot",
    "ur a bot",
    "you are a bot",
  ];

  const isAskingBot = botPatterns.some((p) => lower.includes(p));
  if (isAskingBot) {
    return pick(BOT_DEFLECTIONS);
  }
  return null;
}
