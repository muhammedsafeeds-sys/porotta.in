// ═══════════════════════════════════════════
// Bot Identity Generator
// ═══════════════════════════════════════════
// Generates realistic Indian identities for bot sessions

import type { BotIdentity, BotPersonality, BotGender } from "./types";

// ── Indian Names ──────────────────────────
const MALE_NAMES = [
  "Aarav", "Arjun", "Vihaan", "Aditya", "Sai", "Reyansh", "Kartik", "Kabir",
  "Rohan", "Ishaan", "Dev", "Vivaan", "Ansh", "Dhruv", "Arnav", "Shaurya",
  "Aarush", "Yash", "Sahil", "Nikhil", "Aman", "Rishi", "Parth", "Tanmay",
  "Harsh", "Karan", "Raj", "Ayaan", "Varun", "Mohit", "Akash", "Rishabh",
  "Rahul", "Abhi", "Neel", "Pranav", "Kunal", "Siddharth", "Aniket", "Ritvik",
];

const FEMALE_NAMES = [
  "Aanya", "Saanvi", "Ananya", "Isha", "Priya", "Diya", "Riya", "Sneha",
  "Kavya", "Meera", "Anika", "Tanisha", "Nisha", "Pooja", "Neha", "Shruti",
  "Aditi", "Divya", "Pari", "Myra", "Kiara", "Zara", "Avni", "Navya",
  "Sanya", "Tara", "Sia", "Anvi", "Mahi", "Aarohi", "Nandini", "Ishita",
  "Rhea", "Sakshi", "Kritika", "Simran", "Palak", "Anjali", "Swara", "Aisha",
];

// ── Indian Cities ─────────────────────────
const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune",
  "Ahmedabad", "Jaipur", "Lucknow", "Kochi", "Chandigarh", "Indore",
  "Bhopal", "Coimbatore", "Nagpur", "Vadodara", "Surat", "Visakhapatnam",
  "Thiruvananthapuram", "Gurgaon", "Noida", "Mysore", "Mangalore",
  "Bhubaneswar", "Ranchi", "Dehradun", "Guwahati", "Amritsar", "Udaipur",
  "Jodhpur", "Nashik", "Aurangabad", "Raipur", "Patna", "Thrissur",
  "Kozhikode", "Salem", "Siliguri", "Gwalior",
];

const PERSONALITIES: BotPersonality[] = ["shy", "sarcastic", "curious", "talkative"];

// ── Utility ───────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Public API ────────────────────────────

/**
 * Generate a new bot identity that's compatible with the waiting user's preferences.
 * If the user wants to talk to a "woman", the bot will be a woman, etc.
 */
export function generateIdentity(desiredGender?: string): BotIdentity {
  // Determine bot gender based on what the waiting user wants
  let gender: BotGender;
  if (desiredGender === "man") {
    gender = "man";
  } else if (desiredGender === "woman") {
    gender = "woman";
  } else {
    // "anyone" or undefined — random
    gender = pick(["man", "woman"] as BotGender[]);
  }

  const name = gender === "man" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
  const age = randomInt(19, 27);
  const city = pick(CITIES);
  const personality = pick(PERSONALITIES);

  return { name, age, city, gender, personality };
}

/**
 * Generate a unique IP hash prefix for bot sessions.
 * Format: bot-{random8chars}
 */
export function generateBotIpHash(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let hash = "bot-";
  for (let i = 0; i < 8; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Generate the initial bot state for a new session.
 */
export function createInitialBotState(identity: BotIdentity) {
  return {
    is_bot: true as const,
    identity,
    state: {
      message_count: 0,
      mood: "default" as const,
      mood_shifted_at: null,
      last_responded_msg_id: null,
      respond_after: null,
      exit_at_message: randomInt(15, 25),
      exit_phase: "none" as const,
      conversation_context: [],
    },
  };
}
