/**
 * WearWise Batch Import
 * Reads all images from WearWise Clothes/, calls Gemini Vision for color/material,
 * uploads to Supabase Storage, and inserts item rows.
 * Run: node scripts/batch-import.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
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

// ── Filename → static metadata ───────────────────────────────────────────────
const META = {
  'tshirts': {
    category: 'T-shirt', fit: 'regular', sleeve_length: 'short',
    can_be_worn_open: false, formality: 2,
    vibe: ['casual', 'street'],
    min_temp_c: 20, max_temp_c: 38,
    occasions: ['daily', 'home'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'tshirts-full-sleeve': {
    category: 'T-shirt', fit: 'regular', sleeve_length: 'long',
    can_be_worn_open: false, formality: 2,
    vibe: ['casual', 'street'],
    min_temp_c: 14, max_temp_c: 26,
    occasions: ['daily', 'home'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'tshirts-hoodie': {
    category: 'Hoodie', fit: 'oversized', sleeve_length: 'long',
    can_be_worn_open: false, formality: 1,
    vibe: ['casual', 'street', 'lounge'],
    min_temp_c: 10, max_temp_c: 22,
    occasions: ['daily', 'home', 'gym'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'polo-tshirts': {
    category: 'Polo', fit: 'regular', sleeve_length: 'short',
    can_be_worn_open: false, formality: 3,
    vibe: ['clean', 'smart-casual'],
    min_temp_c: 18, max_temp_c: 35,
    occasions: ['daily', 'work', 'date', 'church'], times_of_day: ['morning', 'afternoon'],
  },
  'shirts': {
    category: 'Shirt (Button-down)', fit: 'regular', sleeve_length: 'long',
    can_be_worn_open: true, formality: 3,
    vibe: ['casual', 'smart-casual', 'clean'],
    min_temp_c: 15, max_temp_c: 30,
    occasions: ['daily', 'work', 'date', 'church'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'shirts-denim': {
    category: 'Shirt (Button-down)', fit: 'regular', sleeve_length: 'long',
    can_be_worn_open: true, formality: 2,
    vibe: ['casual', 'street'],
    material: ['denim'],
    min_temp_c: 14, max_temp_c: 26,
    occasions: ['daily', 'trip'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'shirts-linen': {
    category: 'Shirt (Button-down)', fit: 'relaxed', sleeve_length: 'long',
    can_be_worn_open: true, formality: 3,
    vibe: ['clean', 'casual', 'beach'],
    material: ['linen'],
    min_temp_c: 22, max_temp_c: 38,
    occasions: ['daily', 'date', 'trip', 'church'], times_of_day: ['morning', 'afternoon'],
  },
  'shirts-double-sided': {
    category: 'Shirt (Button-down)', fit: 'regular', sleeve_length: 'long',
    can_be_worn_open: true, formality: 3,
    vibe: ['casual', 'smart-casual'],
    notes: 'Reversible double-sided shirt',
    min_temp_c: 15, max_temp_c: 30,
    occasions: ['daily', 'trip'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'bootcut-pants': {
    category: 'Trousers', fit: 'bootcut',
    can_be_worn_open: false, formality: 3,
    vibe: ['casual', 'smart-casual'],
    min_temp_c: 10, max_temp_c: 30,
    occasions: ['daily', 'work', 'church', 'date'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'bootcut-pants-extended-tab': {
    category: 'Trousers', fit: 'bootcut',
    can_be_worn_open: false, formality: 3,
    vibe: ['casual', 'smart-casual'],
    notes: 'Extended tab waistband',
    min_temp_c: 10, max_temp_c: 30,
    occasions: ['daily', 'work', 'church', 'date'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'cargo-pant': {
    category: 'Cargos', fit: 'regular',
    can_be_worn_open: false, formality: 2,
    vibe: ['casual', 'street', 'travel'],
    min_temp_c: 15, max_temp_c: 32,
    occasions: ['daily', 'trip', 'gym'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'jeans': {
    category: 'Jeans', fit: 'straight',
    can_be_worn_open: false, formality: 2,
    vibe: ['casual', 'street'],
    material: ['denim'],
    min_temp_c: 10, max_temp_c: 28,
    occasions: ['daily', 'date', 'trip'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
  'shorts': {
    category: 'Shorts', fit: 'regular',
    can_be_worn_open: false, formality: 1,
    vibe: ['casual', 'beach', 'lounge'],
    min_temp_c: 24, max_temp_c: 42,
    occasions: ['daily', 'home', 'gym', 'beach'], times_of_day: ['morning', 'afternoon'],
  },
  'trousers': {
    category: 'Trousers', fit: 'straight',
    can_be_worn_open: false, formality: 3,
    vibe: ['smart-casual', 'clean', 'formal'],
    min_temp_c: 10, max_temp_c: 30,
    occasions: ['daily', 'work', 'church', 'date'], times_of_day: ['morning', 'afternoon', 'evening'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMetaKey(filename) {
  const base = path.basename(filename, '.png').replace(/\s*\(\d+\)\s*$/, '').trim();
  return Object.keys(META).sort((a, b) => b.length - a.length).find(k => base === k) ?? null;
}

function buildDisplayName(filename, category, color) {
  const base   = path.basename(filename, '.png');
  const num    = (base.match(/\((\d+)\)/) ?? [])[1];
  const col    = color ? ` ${color}` : '';
  const suffix = num ? ` #${num}` : '';
  return `${col ? col.trim().charAt(0).toUpperCase() + col.trim().slice(1) + ' ' : ''}${category}${suffix}`.trim();
}

async function geminiColor(imagePath) {
  try {
    const b64  = fs.readFileSync(imagePath).toString('base64');
    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: b64 } },
          { text: 'This is a clothing item on a black background. Return ONLY valid JSON, no markdown: {"primary_color":"one plain word like black/white/navy/grey/beige/olive/cream/brown/burgundy/green/blue/red/pink/yellow/orange/purple/teal","secondary_colors":[],"material":["one of cotton/denim/linen/polyester/wool/silk/fleece/nylon"]}' },
        ],
      }],
      config: { responseMimeType: 'application/json' },
    });
    const text = resp.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return JSON.parse(text.trim());
  } catch {
    return { primary_color: null, secondary_colors: [], material: [] };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🗄  Fetching categories...');
  const { data: cats, error: catErr } = await supa.from('categories').select('id, name');
  if (catErr) throw new Error(catErr.message);
  const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));
  console.log(`✓ ${cats.length} categories loaded\n`);

  const FOLDERS = ['WearWise Clothes/Upperwear', 'WearWise Clothes/LowerWear'];
  let ok = 0, skip = 0, fail = 0;

  for (const folder of FOLDERS) {
    const dir   = path.join(ROOT, folder);
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.png')).sort();
    console.log(`📁  ${folder}  (${files.length} files)`);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const key      = getMetaKey(file);

      if (!key) { console.log(`  ⚠ skip  ${file}  — no mapping`); skip++; continue; }

      const meta       = META[key];
      const categoryId = catMap[meta.category];
      if (!categoryId) { console.log(`  ⚠ skip  ${file}  — category "${meta.category}" not in DB`); skip++; continue; }

      process.stdout.write(`  ↑ ${file.padEnd(45)} `);

      // Vision
      const vision   = await geminiColor(filePath);
      const color    = vision.primary_color ?? 'unknown';
      const material = [...new Set([...(meta.material ?? []), ...(vision.material ?? [])])];

      // Upload
      const uuid        = randomUUID();
      const storagePath = `items/${uuid}.png`;
      const { error: upErr } = await supa.storage
        .from('items')
        .upload(storagePath, fs.readFileSync(filePath), { contentType: 'image/png' });

      if (upErr) { console.log(`FAIL upload: ${upErr.message}`); fail++; continue; }

      const { data: urlData } = supa.storage.from('items').getPublicUrl(storagePath);

      // Insert
      const name = buildDisplayName(file, meta.category, color);
      const { error: insErr } = await supa.from('items').insert({
        id: uuid,
        name,
        category_id: categoryId,
        image_url:   urlData.publicUrl,
        image_path:  storagePath,
        primary_color:    color,
        secondary_colors: vision.secondary_colors ?? [],
        fit:              meta.fit             ?? null,
        sleeve_length:    meta.sleeve_length   ?? null,
        can_be_worn_open: meta.can_be_worn_open ?? false,
        material,
        formality:    meta.formality,
        vibe:         meta.vibe,
        min_temp_c:   meta.min_temp_c  ?? null,
        max_temp_c:   meta.max_temp_c  ?? null,
        occasions:    meta.occasions   ?? [],
        times_of_day: meta.times_of_day ?? [],
        notes:        meta.notes ?? null,
        times_worn:   0,
        archived:     false,
      });

      if (insErr) {
        await supa.storage.from('items').remove([storagePath]);
        console.log(`FAIL insert: ${insErr.message}`); fail++; continue;
      }

      console.log(`✓  ${name} [${color}]`);
      ok++;

      // 600ms pause — avoids Gemini rate limit
      await new Promise(r => setTimeout(r, 600));
    }
    console.log();
  }

  console.log(`${'─'.repeat(55)}`);
  console.log(`✅  ${ok} imported   ⚠ ${skip} skipped   ✗ ${fail} failed`);
  console.log(`${'─'.repeat(55)}\n`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
