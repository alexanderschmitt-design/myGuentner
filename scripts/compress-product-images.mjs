/**
 * Converts the "EU hero" product images used by the catalog to compressed WebP.
 * Resizes to max 900px wide, quality 82 — typically <150 KB per image.
 * Run once: node scripts/compress-product-images.mjs
 */
import sharp from 'sharp'
import { readdir, mkdir } from 'fs/promises'
import { join, basename, extname } from 'path'
import { fileURLToPath } from 'url'

const __dir = fileURLToPath(new URL('.', import.meta.url))
const srcDir = join(__dir, '..', 'nuxt', 'public', 'images', 'products')
const outDir = srcDir  // overwrite in-place as WebP

// Only the files actually referenced by productImagePath.ts + catalog rules
const HERO_FILES = [
  'Agri Air Cooler EU.png',
  'Blast Air Cooler EU.png',
  'Cubic COMPACT Air Cooler EU.png',
  'Cubic VARIO Air Cooler EU.png',
  'Dual COMPACT Air Cooler EU.png',
  'Dual VARIO Air Cooler EU.png',
  'Flat COMPACT Dry Cooler EU.png',
  'Flat VARIO Dry Cooler EU.png',
  'Floor Air Cooler EU.png',
  'Highstore Air Cooler EU.png',
  'Incoor-H Dry Cooler EU.png',
  'Indoor-V Dry Cooler EU.png',
  'Mini COMPACT Air Cooler EU.png',
  'Slim COMPACT Air Cooler EU.png',
  'V-shape COMPACT Dry Cooler EU.png',
  'V-shape VARIO Dry Cooler EU.png',
  'V-Shape Vario HydroBlu_A1.png',
  'Vertical COMPACT Dry Cooler EU.png',
  'Vertical VARIO Dry Cooler EU.png',
]

let totalIn = 0, totalOut = 0

for (const file of HERO_FILES) {
  const src = join(srcDir, file)
  const webpName = file.replace(/\.(png|jpg|jpeg)$/i, '.webp')
  const dst = join(outDir, webpName)

  try {
    const info = await sharp(src)
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(dst)

    const srcStat = (await import('fs')).statSync(src)
    const kbIn  = Math.round(srcStat.size / 1024)
    const kbOut = Math.round(info.size / 1024)
    totalIn  += srcStat.size
    totalOut += info.size
    console.log(`✓ ${file.padEnd(45)} ${kbIn.toString().padStart(5)} KB → ${kbOut.toString().padStart(4)} KB  (${webpName})`)
  } catch (e) {
    console.warn(`✗ ${file}: ${e.message}`)
  }
}

console.log(`\nTotal: ${Math.round(totalIn/1024/1024)} MB → ${Math.round(totalOut/1024/1024)} MB`)
