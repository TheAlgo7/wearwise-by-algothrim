/**
 * WearWise — Profile + Hoodie Reclassification
 *  1. Reclassifies the 2 `tshirts-hoodie` items: they are thin short-sleeve
 *     t-shirts that happen to have a hood — not outerwear. Move them to
 *     category "T-shirt", sleeve=short, base layer.
 *  2. Writes Gaurav's full Style Blueprint into style_profile (the blueprint
 *     text is what the generation prompt reads on every call).
 * Run: node scripts/update-profile-and-hoodies.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const envRaw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ─── 1. Hoodie reclassification ──────────────────────────────────────────────
async function fixHoodies() {
  console.log('\n🧵  Reclassifying hooded tees...');

  const { data: cats } = await supa.from('categories').select('id, name');
  const tshirtId = cats.find(c => c.name === 'T-shirt').id;
  const hoodieId = cats.find(c => c.name === 'Hoodie').id;

  const { data: hoodies } = await supa
    .from('items')
    .select('id, name')
    .eq('category_id', hoodieId);

  for (const h of hoodies) {
    await supa.from('items').update({
      category_id:  tshirtId,
      sleeve_length: 'short',
      fit:           'oversized',
      formality:     1,
      min_temp_c:    18,
      max_temp_c:    34,
      occasions:     ['home', 'daily'],
      times_of_day:  ['morning', 'afternoon', 'evening'],
      vibe:          ['casual', 'lounge', 'street'],
      notes:         'Hooded tee — thin short-sleeve t-shirt with a hood. Usually worn alone at home; layer under an open button-down when cooler.',
    }).eq('id', h.id);
    console.log(`  ✓ ${h.name} → T-shirt / short sleeve / base layer`);
  }
}

// ─── 2. Style Blueprint ──────────────────────────────────────────────────────
const BLUEPRINT = `Professional identity: Gaurav Kumar — "The Algothrim". Senior Digital Artist & Full-Stack Developer. Co-founder of Ruach's Farm LLP.

Physical profile:
- Tall, skinny frame with a long torso and long legs
- Thin biceps/upper arms; good forearm vascularity
- Warm tan complexion, dark hair growing out into a Wolf Cut flow
- Style goal: create balanced proportions, broaden the upper body, hide thin biceps, highlight forearms

Wardrobe architecture — Japanese Bootcut Strategy:
- Signature lower-body silhouette is the Japanese-style bootcut pant: slim through the thighs with a subtle flare from the knee down
- Mid-rise, resting on the hips (balances the long torso + long legs)
- Deep single or double front pleats add volume around the hips
- Hem is deliberately long — creates a "puddle" / full break over the shoes
- Extended-tab (Gurkha-style) waistband with buttons is used on dressier colours (Black, Light Beige) — always worn with shirts tucked in for a sharp tailored waistline
- Normal-tab waistband is used on casual colours (Dark Grey, Dark Beige/Sand, Coffee Brown) — worn with oversized tees untucked

Hard avoidances:
- Never propose straight-fit jeans or trousers
- Never propose skinny jeans or slim-fit bottoms
- Never tuck a t-shirt into a bootcut pant with a normal waistband

Tops — upper-body proportioning:
- T-shirts: boxy, oversized, drop-shoulder cuts where the sleeve seam falls off the shoulder to broaden the frame
- Button-downs: relaxed / flowy fits; Cuban collars and textured linen are favoured
- On any button-down, sleeves should be rolled to just below the elbow / mid-forearm — hides thin biceps, highlights forearms
- Hooded tees are worn mostly alone at home; pair with an open shirt over them when cooler

Footwear — the flared puddle needs substantial, chunky shoes:
- Dressier: Black or Brown Chelsea Boots — the pant hem falls over the boot shaft to elongate the legs
- Casual / streetwear: heavy sneakers from a 19-pair collection (Travis Scott AJ1 Low Black Phantom, Dior B23 High Tops, Nike SB Dunks, classic Converse)

Palette preferences:
- Preferred neutrals: black, white, cream, beige, olive, charcoal, navy, coffee brown, dark grey, sand
- Accent colours used sparingly: burgundy, maroon, teal
- Tonal / earth-tone combinations over high-contrast colour-blocking

Occasion awareness:
- Consider daily context (weather, indoor AC, time of day) but also life events
- For weddings / formal events: max-formality outfit, Gurkha-tab bootcut in Black or Light Beige, crisp button-down tucked in, Chelsea boots
- For meetings: smart-casual — shirt + bootcut + Chelsea boots or clean sneakers
- For home / lounge days: hooded tee alone + casual bootcut; comfort first
- For dates: signature combos, stronger silhouette, Dior B23 or Chelseas
- For travel: layerable neutrals, forgiving fits, repeatable pieces

Signature moves:
- Open button-down (rolled sleeves) worn over an oversized tee as a mid layer
- Boxy drop-shoulder tee + bootcut + chunky sneaker
- Crisp tucked button-down + Gurkha-tab bootcut + Chelsea boots for impress/wedding moments`;

async function writeBlueprint() {
  console.log('\n📝  Writing Style Blueprint...');
  const { error } = await supa
    .from('style_profile')
    .update({
      user_name:       'Gaurav Kumar',
      body_type:       'Tall, skinny. Long torso, long legs. Thin biceps, vascular forearms. Warm tan skin.',
      preferred_fits:  ['bootcut', 'oversized', 'relaxed', 'drop-shoulder', 'straight'],
      preferred_colors:['black', 'white', 'cream', 'beige', 'olive', 'charcoal', 'navy', 'coffee', 'sand', 'burgundy', 'maroon'],
      avoided_colors:  [],
      avoided_combinations: [
        { reason: 'exaggerates thin frame',            items: ['skinny fit bottom', 'slim fit bottom', 'straight fit bottom'] },
        { reason: 'normal-tab bootcut is an untucked silhouette', items: ['tucked tee', 'normal-tab bootcut'] },
      ],
      signature_combos: [
        { name: 'Layered Casual',   vibe: 'casual',        items: ['oversized drop-shoulder tee', 'open button-down rolled sleeves', 'bootcut normal-tab', 'chunky sneakers'] },
        { name: 'Impress / Wedding', vibe: 'formal',        items: ['crisp button-down tucked', 'Gurkha-tab bootcut in black or light beige', 'Chelsea boots'] },
        { name: 'Street Clean',      vibe: 'smart-casual',  items: ['boxy tee', 'Gurkha-tab bootcut', 'Dior B23 or SB Dunks'] },
      ],
      notes: BLUEPRINT,
    })
    .eq('id', '00000000-0000-0000-0000-000000000001');

  if (error) throw new Error(error.message);
  console.log('  ✓ Blueprint saved into style_profile');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await fixHoodies();
  await writeBlueprint();
  console.log('\n✅  Done.\n');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
