import { GoogleGenAI } from '@google/genai';

const EMBED_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-2.5-flash';

let client: GoogleGenAI | null = null;

function ai(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  client = new GoogleGenAI({ apiKey });
  return client;
}

/** Embed a single string into a vector. */
export async function embed(text: string): Promise<number[]> {
  const res = await ai().models.embedContent({
    model: EMBED_MODEL,
    contents: text,
  });
  const values = res.embeddings?.[0]?.values;
  if (!values) throw new Error('Gemini returned no embedding');
  return values;
}

/** One-shot text generation. Returns plain text. */
export async function generate(prompt: string): Promise<string> {
  const res = await ai().models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
  });
  return (res.text ?? '').trim();
}
