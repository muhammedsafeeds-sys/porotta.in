const GEMINI_API_KEY = "AIzaSyCMSZpvCTfItVBRTtzIr8tZaJhzRAwzmms";

async function testGemini() {
  console.log("Testing Gemini API Key...");
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello! Reply with a single word: 'WORKING'." }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Call Failed.");
      console.error("Status:", response.status);
      console.error("Error details:", errorText);
      return;
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("✅ API Call Successful!");
    console.log("Response:", reply);
    
  } catch (error) {
    console.error("❌ Network or Execution Error:", error);
  }
}

testGemini();
