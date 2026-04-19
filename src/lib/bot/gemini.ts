// ═══════════════════════════════════════════
// Gemini Flash API Integration
// ═══════════════════════════════════════════
// Direct REST API calls — no SDK dependency

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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

// Fallback responses if Gemini fails
const FALLBACK_RESPONSES = [
  "hmm",
  "lol",
  "yea true",
  "haha nice",
  "ohh ok",
  "damn",
  "fr",
  "interesting",
  "that's cool",
  "wait what",
  "ngl same",
  "lmao",
  "no way",
  "oh wow",
  "haha",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a response using Gemini Flash API.
 * Falls back gracefully if the API is unavailable.
 */
export async function generateResponse(
  systemPrompt: string,
  messageHistory: Array<{ role: "user" | "model"; parts: { text: string }[] }>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[Bot] No GEMINI_API_KEY set — using fallback response");
    return pick(FALLBACK_RESPONSES);
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
    // This shouldn't happen in normal flow, but handle defensively
    return pick(FALLBACK_RESPONSES);
  }

  const requestBody: GeminiRequest = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
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
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      console.error(`[Bot] Gemini API error ${response.status}: ${errorText}`);
      return pick(FALLBACK_RESPONSES);
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
      console.error(`[Bot] Gemini API error: ${data.error.message}`);
      return pick(FALLBACK_RESPONSES);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[Bot] Empty response from Gemini");
      return pick(FALLBACK_RESPONSES);
    }

    // Clean up the response — strip quotes, extra whitespace
    let cleaned = text.trim();
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

    return cleaned || pick(FALLBACK_RESPONSES);
  } catch (error: any) {
    console.error(`[Bot] Gemini API call failed: ${error.message || error}`);
    return pick(FALLBACK_RESPONSES);
  }
}
