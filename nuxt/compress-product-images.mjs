import sharp from 'sharp'
import { statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const imgDir = join(__dir, 'public', 'images', 'products')

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
  const src = join(imgDir, file)
  const dst = join(imgDir, file.replace(/\.(png|jpg|jpeg)$/i, '.webp'))
  try {
    const info = await sharp(src).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 82 }).toFile(dst)
    const kbIn = Math.round(statSync(src).size / 1024)
    const kbOut = Math.round(info.size / 1024)
    totalIn += statSync(src).size; totalOut += info.size
    console.log(`✓ ${file.padEnd(42)} ${String(kbIn).padStart(5)} KB → ${String(kbOut).padStart(4)} KB`)
  } catch (e) { console.warn(`✗ ${file}: ${e.message}`) }
}
console.log(`\nTotal: ${Math.round(totalIn/1024/1024)} MB → ${Math.round(totalOut/1024/1024)} MB`)
