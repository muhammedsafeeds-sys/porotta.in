interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateOpenAIResponse(
  systemPrompt: string,
  messageHistory: Array<{ role: 'user' | 'assistant'; parts: { text: string }[] }>,
  apiKey: string
): Promise<string> {
  const messages: OpenAIMessage[] = [];
  // system prompt
  messages.push({ role: 'system', content: systemPrompt });
  // convert chat history (user then assistant)
  for (const msg of messageHistory) {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    messages.push({ role, content: msg.parts[0].text });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', // cheapest OpenAI model
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[OpenAI] API error', response.status, err);
    throw new Error('OpenAI request failed');
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();
  return answer || '';
}
