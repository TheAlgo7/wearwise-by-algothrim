/**
 * Fix PWA icons — flatten transparent backgrounds to solid black.
 * Transparent corners (from squircle shape) show as white on Android splash screens.
 * Run: node scripts/fix-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dir, '../public/icons');

async function flattenToBlack(src, dest, size) {
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([{ input: src, blend: 'over' }])
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log(`✓ ${dest.split('/').pop()} (${size}×${size})`);
}

async function main() {
  const src512 = join(iconsDir, 'icon-512.png');
  const src192 = join(iconsDir, 'icon-192.png');

  // Flatten: black canvas → composite original on top → no transparent pixels remain
  await flattenToBlack(src512, join(iconsDir, 'icon-512.png'), 512);
  await flattenToBlack(src192, join(iconsDir, 'icon-192.png'), 192);

  // Also flatten maskable just in case
  await flattenToBlack(join(iconsDir, 'icon-maskable-512.png'), join(iconsDir, 'icon-maskable-512.png'), 512);

  console.log('\nAll icons fixed — no more white borders on splash screen.');
}

main().catch((e) => { console.error(e); process.exit(1); });
