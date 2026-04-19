import { generateResponse } from "./src/lib/bot/gemini.js";

async function test() {
  const systemPrompt = "You are a friendly bot named TestBot.";
  const history = [
    { role: "user", parts: [{ text: "hello there" }] }
  ];
  
  console.log("Calling generateResponse...");
  const reply = await generateResponse(systemPrompt, history as any);
  console.log("Reply:", reply);
}

test();
