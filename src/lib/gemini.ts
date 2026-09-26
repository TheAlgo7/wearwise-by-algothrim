import { GoogleGenAI } from '@google/genai';

let _client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

/**
 * Both 2.0 models were retired (404), which silently broke tagging and photo
 * clean-up when adding clothes. `gemini-flash-latest` follows Google's current
 * Flash, so it cannot retire under us again. Image editing has no free-tier
 * quota on any model (checked 2026-09-27): without billing on the key, clean-up
 * returns 429 and the add forms keep the original photo, as they always have.
 */
export const MODELS = {
  /** Vision + JSON for tagging a new item. */
  reasoning: 'gemini-flash-latest',
  /** Background clean-up for garment photos. */
  image:     'gemini-2.5-flash-image',
} as const;
