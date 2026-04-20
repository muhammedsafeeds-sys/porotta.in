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

// ── Intelligent Offline Fallback Engine ──
// This kicks in if Gemini hits the rate limit (429 Quota Exceeded)
function generateOfflineFallback(userMessage: string, botSessionId?: string): string {
  const msg = userMessage.toLowerCase().trim();
  
  if (msg === "hi" || msg === "hey" || msg === "hello" || msg === "hii") {
    return pick(["heyy", "hey whats up", "hii there", "yo"]);
  }
  if (msg.includes("m or f") || msg.includes("asl") || msg === "m" || msg === "f") {
    // Ideally we would pull the bot's actual identity, but a generic casual deflection works
    return pick(["M", "F", "im a guy lol", "girl here"]); 
  }
  if (msg.includes("where") || msg.includes("from")) {
    return pick(["mumbai wbu", "delhi", "im from bangalore", "pune hby"]);
  }
  if (msg.includes("how old") || msg.includes("age")) {
    return pick(["22", "24 wbu", "21"]);
  }
  if (msg.includes("what doing") || msg.includes("wyd") || msg.includes("what are you doing")) {
    return pick(["nm just chilling", "listening to music wbu", "bored scrolling tbh"]);
  }
  if (msg.includes("haha") || msg.includes("lol") || msg.includes("lmao")) {
    return pick(["hehe", "lol yeah", "💀"]);
  }
  if (msg.endsWith("?")) {
    return pick(["idk tbh", "maybe", "yeah probably", "not really sure"]);
  }

  // Generic conversational fillers
  const generic = [
    "hmm", "ohh ok", "yeah true", "damn", "fr", 
    "interesting", "wait what", "ngl same", "oh wow", 
    "makes sense", "anyway what's up with u"
  ];
  return pick(generic);
}

/**
 * Generate a response using Gemini Flash API.
 * Falls back to Intelligent Offline Engine if the API is unavailable.
 */
export async function generateResponse(
  systemPrompt: string,
  messageHistory: Array<{ role: "user" | "model"; parts: { text: string }[] }>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  const lastUserMessage = messageHistory.slice().reverse().find(m => m.role === "user")?.parts[0]?.text || "hi";

  if (!apiKey) {
    console.warn("[Bot] No GEMINI_API_KEY set — using fallback response");
    return generateOfflineFallback(lastUserMessage);
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
    return generateOfflineFallback(lastUserMessage);
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
    let response: Response | null = null;
    let lastError = "";

    // Try each model until one works
    for (const model of GEMINI_MODELS) {
      try {
        const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          console.log(`[Bot] Gemini model ${model} responded OK`);
          break;
        }
        lastError = await response.text().catch(() => "unknown");
        console.warn(`[Bot] Model ${model} failed (${response.status}): ${lastError.slice(0, 200)}`);
        response = null;
      } catch (e: any) {
        lastError = e.message || String(e);
        console.warn(`[Bot] Model ${model} threw: ${lastError}`);
        response = null;
      }
    }

    if (!response || !response.ok) {
      console.error(`[Bot] All Gemini models failed. Last error: ${lastError}`);
      return generateOfflineFallback(lastUserMessage);
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
      console.error(`[Bot] Gemini API error: ${data.error.message}`);
      return generateOfflineFallback(lastUserMessage);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[Bot] Empty response from Gemini");
      return generateOfflineFallback(lastUserMessage);
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

    return cleaned || generateOfflineFallback(lastUserMessage);
  } catch (error: any) {
    console.error(`[Bot] Gemini API call failed: ${error.message || error}`);
    return generateOfflineFallback(lastUserMessage);
  }
}
