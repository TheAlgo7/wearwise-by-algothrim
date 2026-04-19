/**
 * WearWise — Fix Unknown Colors
 * Fetches all items where primary_color = 'unknown', re-downloads the image
 * from Supabase Storage, asks Gemini with a more aggressive prompt, then
 * patches primary_color, secondary_colors, material, and name in the DB.
 * Run: node scripts/fix-unknown-colors.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Load .env.local ──────────────────────────────────────────────────────────
const envRaw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ai   = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ── Better Gemini prompt — forces a colour answer ────────────────────────────
async function geminiColorFromUrl(imageUrl, retries = 4) {
  // Download image once
  const res  = await fetch(imageUrl);
  const buf  = Buffer.from(await res.arrayBuffer());
  const b64  = buf.toString('base64');
  const mime = res.headers.get('content-type') ?? 'image/png';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: mime, data: b64 } },
            {
              text: `This is a clothing item on a dark/black background.
Look ONLY at the garment itself — ignore the background completely.
What is the single dominant colour of this garment?

Rules:
- You MUST return a colour — never "unknown" or "null"
- Use the closest plain word: black / white / navy / grey / charcoal / beige / cream / olive / brown / burgundy / maroon / green / blue / red / pink / yellow / orange / purple / teal / khaki / camel / rust / mustard / coral
- If the garment is very dark, still name it (e.g. dark shirts are navy/charcoal/black, not unknown)
- If it has a pattern (plaid, stripe, check), pick the background base colour

Return ONLY valid JSON, no markdown:
{"primary_color":"one word","secondary_colors":[],"material":["cotton"]}`,
            },
          ],
        }],
        config: { responseMimeType: 'application/json' },
      });

      const text = resp.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      return JSON.parse(text.trim());

    } catch (e) {
      // Parse retryDelay from the 429 error body if present
      let waitMs = 8000;
      try {
        const body = JSON.parse(e.message);
        const retryDelay = body?.error?.details
          ?.find(d => d['@type']?.includes('RetryInfo'))?.retryDelay ?? '';
        const secs = parseFloat(retryDelay);
        if (!isNaN(secs) && secs > 0) waitMs = Math.ceil(secs * 1000) + 1000;
      } catch { /* ignore parse errors */ }

      if (attempt < retries) {
        process.stdout.write(`\n    rate-limited — waiting ${Math.round(waitMs / 1000)}s… `);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        return null;
      }
    }
  }
  return null;
}

function rebuildName(oldName, newColor) {
  // "Unknown T-shirt #3" → "Blue T-shirt #3"
  // "Unknown Trousers #1" → "Grey Trousers #1"
  const capitalized = newColor.charAt(0).toUpperCase() + newColor.slice(1);
  return oldName.replace(/^Unknown\s+/, `${capitalized} `);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍  Fetching items with unknown color...');
  const { data: items, error } = await supa
    .from('items')
    .select('id, name, primary_color, image_url, material')
    .eq('primary_color', 'unknown');

  if (error) throw new Error(error.message);
  console.log(`✓ ${items.length} items to fix\n`);

  if (items.length === 0) {
    console.log('Nothing to do — no unknown colors found.');
    return;
  }

  let ok = 0, fail = 0;

  for (const item of items) {
    process.stdout.write(`  ↺ ${item.name.padEnd(45)} `);

    const vision = await geminiColorFromUrl(item.image_url);
    if (!vision || !vision.primary_color || vision.primary_color === 'unknown') {
      console.log('SKIP — still unknown after retry');
      fail++;
      await new Promise(r => setTimeout(r, 400));
      continue;
    }

    const newColor   = vision.primary_color.toLowerCase();
    const newName    = rebuildName(item.name, newColor);
    const newMat     = [...new Set([...(item.material ?? []), ...(vision.material ?? [])])];

    const { error: upErr } = await supa
      .from('items')
      .update({
        primary_color:    newColor,
        secondary_colors: vision.secondary_colors ?? [],
        material:         newMat,
        name:             newName,
      })
      .eq('id', item.id);

    if (upErr) {
      console.log(`FAIL: ${upErr.message}`);
      fail++;
    } else {
      console.log(`✓  ${newName} [${newColor}]`);
      ok++;
    }

    // 600ms pause to stay within Gemini rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`✅  ${ok} fixed   ✗ ${fail} still unknown`);
  console.log(`${'─'.repeat(55)}\n`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
