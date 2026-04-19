/**
 * WearWise — Local Colour Detection (no Gemini quota used)
 * Downloads each "unknown" item's image from Supabase Storage, parses the
 * PNG pixels locally, averages the non-background colour, and maps to a
 * named colour. Then patches primary_color + name in the DB.
 * Run: node scripts/fix-colors-local.mjs
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Load .env.local ──────────────────────────────────────────────────────────
const envRaw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── Named colour palette ─────────────────────────────────────────────────────
const PALETTE = [
  ['black',      20,  20,  22 ],
  ['charcoal',   55,  55,  60 ],
  ['grey',       135, 135, 135],
  ['white',      240, 240, 238],
  ['cream',      245, 232, 205],
  ['beige',      220, 195, 160],
  ['khaki',      180, 165, 105],
  ['camel',      180, 145, 100],
  ['brown',      110, 75,  50 ],
  ['coffee',     80,  55,  40 ],
  ['rust',       180, 90,  50 ],
  ['mustard',    200, 170, 50 ],
  ['olive',      110, 115, 50 ],
  ['green',      60,  130, 60 ],
  ['teal',       50,  130, 130],
  ['navy',       30,  45,  90 ],
  ['blue',       55,  105, 195],
  ['purple',     120, 60,  140],
  ['burgundy',   110, 30,  45 ],
  ['maroon',     90,  30,  40 ],
  ['red',        195, 45,  50 ],
  ['coral',      235, 130, 120],
  ['pink',       230, 140, 160],
  ['orange',     230, 130, 50 ],
  ['yellow',     230, 210, 80 ],
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, v];
}

function nearestNamed(r, g, b) {
  let best = null, bestDist = Infinity;
  for (const [name, pr, pg, pb] of PALETTE) {
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

/** Sample garment pixels via sharp (handles PNG/JPEG), skip black bg. */
async function analyseImage(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  const stride = info.channels;
  for (let i = 0; i < data.length; i += stride) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = stride === 4 ? data[i + 3] : 255;
    if (a < 30) continue;
    const brightness = r + g + b;
    if (brightness < 60) continue;   // near-black bg
    if (brightness > 720) continue;  // near-white highlight
    sumR += r; sumG += g; sumB += b; count++;
  }
  if (count === 0) return null;

  const avgR = Math.round(sumR / count);
  const avgG = Math.round(sumG / count);
  const avgB = Math.round(sumB / count);
  const [h, s, v] = rgbToHsv(avgR, avgG, avgB);

  if (s < 0.12) {
    if (v < 0.18) return 'black';
    if (v < 0.35) return 'charcoal';
    if (v < 0.65) return 'grey';
    if (v < 0.88) return 'cream';
    return 'white';
  }
  if (s < 0.28 && v > 0.35 && v < 0.75 && h < 60) {
    return v > 0.55 ? 'beige' : 'brown';
  }
  return nearestNamed(avgR, avgG, avgB);
}

function rebuildName(oldName, newColor) {
  const cap = newColor.charAt(0).toUpperCase() + newColor.slice(1);
  return oldName.replace(/^Unknown\s+/, `${cap} `);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍  Fetching unknown items...');
  const { data: items, error } = await supa
    .from('items')
    .select('id, name, image_url')
    .eq('primary_color', 'unknown');

  if (error) throw new Error(error.message);
  console.log(`✓ ${items.length} items to fix\n`);

  let ok = 0, fail = 0;
  for (const item of items) {
    process.stdout.write(`  ↺ ${item.name.padEnd(45)} `);
    try {
      const res = await fetch(item.image_url);
      const buf = Buffer.from(await res.arrayBuffer());
      const color = await analyseImage(buf);
      if (!color) { console.log('FAIL — no usable pixels'); fail++; continue; }

      const newName = rebuildName(item.name, color);
      const { error: upErr } = await supa
        .from('items')
        .update({ primary_color: color, name: newName })
        .eq('id', item.id);

      if (upErr) { console.log(`FAIL DB: ${upErr.message}`); fail++; continue; }

      console.log(`✓  ${newName} [${color}]`);
      ok++;
    } catch (e) {
      console.log(`FAIL: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`✅  ${ok} fixed   ✗ ${fail} failed`);
  console.log(`${'─'.repeat(55)}\n`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
