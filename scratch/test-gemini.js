const GEMINI_API_KEY = "AIzaSyCMSZpvCTfItVBRTtzIr8tZaJhzRAwzmms";

async function testGemini() {
  console.log("Testing Gemini API Key...");
  
  try {
    const r1 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] })
    });
    console.log("1.5-Flash-Latest status:", r1.status);
    
  } catch (error) {
    console.error("❌ Network or Execution Error:", error);
  }
}

testGemini();
