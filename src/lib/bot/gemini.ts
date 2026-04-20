// ═══════════════════════════════════════════
// Gemini Flash API Integration
// ═══════════════════════════════════════════
// Direct REST API calls — no SDK dependency

// Confirmed working models (tested April 2026)
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiRequest {
  systemInstruction: {
    parts: { text: string }[];
  };
  contents: Array<{
    role: "user" | "model";
    parts: { text: string }[];
  }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    topP: number;
    topK: number;
  };
  safetySettings: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

import { generateOpenAIResponse } from "./openai";

// ── Fallback behavior when API fails ──
async function triggerEndChatFallback(): Promise<string> {
  // If both models fail, wait 5 seconds then naturally end the chat
  await new Promise((res) => setTimeout(res, 5000));
  return "[END_CHAT]";
}

/**
 * Generate a response using Gemini Flash API.
 * Falls back to OpenAI if Gemini fails.
 * If both fail, ends chat after 5 seconds.
 */
export async function generateResponse(
  systemPrompt: string,
  messageHistory: Array<{ role: "user" | "model"; parts: { text: string }[] }>
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIApiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openAIApiKey) {
    console.warn("[Bot] No API keys set — aborting response");
    return triggerEndChatFallback();
  }

  // Ensure the conversation starts with a "user" message (Gemini requirement)
  let validHistory = [...messageHistory];
  while (validHistory.length > 0 && validHistory[0].role === "model") {
    validHistory.shift();
  }

  // Ensure alternating roles — merge consecutive same-role messages
  const mergedHistory: typeof validHistory = [];
  for (const msg of validHistory) {
    const last = mergedHistory[mergedHistory.length - 1];
    if (last && last.role === msg.role) {
      last.parts[0].text += "\n" + msg.parts[0].text;
    } else {
      mergedHistory.push({ ...msg, parts: [{ text: msg.parts[0].text }] });
    }
  }

  // If empty or ends with model, we need a user message
  if (mergedHistory.length === 0) {
    mergedHistory.push({ role: "user", parts: [{ text: "hey" }] });
  }
  if (mergedHistory[mergedHistory.length - 1].role === "model") {
    return triggerEndChatFallback();
  }

  // ---------- Try Gemini (cheapest model – flash-lite) ----------
  let successText = "";
  if (geminiKey) {
    const requestBody: GeminiRequest = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: mergedHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 60,
        topP: 0.9,
        topK: 30,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    try {
      const url = `${GEMINI_BASE}/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data: GeminiResponse = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          successText = text;
        } else {
          console.warn("[Gemini] Empty response");
        }
      } else {
        const err = await response.text();
        console.error("[Gemini] API error", response.status, err);
      }
    } catch (e: any) {
      console.error("[Gemini] Request failed", e.message || e);
    }
  }

  // ---------- Fallback to OpenAI (cheapest model) ----------
  if (!successText && openAIApiKey) {
    try {
      console.log("[Bot] Falling back to OpenAI (gpt-3.5-turbo)");
      const openAIAnswer = await generateOpenAIResponse(
        systemPrompt,
        mergedHistory,
        openAIApiKey
      );
      if (openAIAnswer) successText = openAIAnswer;
    } catch (e: any) {
      console.error("[OpenAI] Request failed", e.message || e);
    }
  }

  // ---------- If both fail, wait 5 seconds then end chat ----------
  if (!successText) {
    return triggerEndChatFallback();
  }

  // ---------- Clean up the response ----------
  let cleaned = successText.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Truncate if too long (enforce 1–2 sentence rule)
  if (cleaned.length > 150) {
    const sentences = cleaned.split(/[.!?]+/).filter(Boolean);
    cleaned = sentences.slice(0, 2).join(". ").trim();
    if (cleaned.length > 150) {
      cleaned = cleaned.slice(0, 147) + "...";
    }
  }

  return cleaned || triggerEndChatFallback();
}
