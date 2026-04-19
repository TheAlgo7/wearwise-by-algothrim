import { GoogleGenAI } from '@google/genai';

let _client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

export const MODELS = {
  /** Fast reasoning for outfit generation + tagging. */
  reasoning: 'gemini-2.5-flash',
  /** Multimodal image generation / editing (a.k.a. "Nano Banana 2"). */
  image:     'gemini-2.5-flash-image',
} as const;
