import fetch from 'node-fetch';
import fs from 'fs';

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.MODEL;

export async function extractExpenseJSON(message, payer) {
  const prompt = `You are an expense bot. Extract the following fields from this message:\n\nMessage: "${message}"\n\nReturn JSON like:\n{"description": "...", "amount": ..., "payer": "...", "participants": ["..."]}\n\nUse payer: "${payer}".`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a JSON extraction bot.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await res.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}

export async function summarizeExpenses(expenses, username) {
  const systemPrompt = fs.readFileSync('./prompts/summarizer.txt', 'utf-8');
  const userPrompt = `Here are all the expenses:\n${JSON.stringify(expenses, null, 2)}\n\nTell me who owes what.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await res.json();
  return data.choices[0].message.content;
}
