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
  /** Fast model for outfit generation + tagging — low latency. */
  reasoning: 'gemini-2.0-flash',
  /** Multimodal image generation / editing. */
  image:     'gemini-2.0-flash-exp-image-generation',
} as const;
