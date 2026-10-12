/**
 * GET /api/admin/products/images
 * Lists available product images from /public/images/products/.
 * Works only in local dev (Node FS access). In Vercel serverless the
 * directory is not reachable — returns a curated static fallback list instead.
 *
 * Query: ?filter=eu   → only "EU.png" hero images (default)
 *        ?filter=all  → every file in the folder
 *
 * Response: { ok, images: string[], fallback?: true }
 */

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { requireAdmin } from '../../../utils/auth'

const EU_FALLBACK = [
  'Agri Air Cooler EU.webp',
  'Blast Air Cooler EU.webp',
  'Cubic COMPACT Air Cooler EU.webp',
  'Cubic VARIO Air Cooler EU.webp',
  'Dual COMPACT Air Cooler EU.webp',
  'Dual VARIO Air Cooler EU.webp',
  'Flat COMPACT Dry Cooler EU.webp',
  'Flat VARIO Dry Cooler EU.webp',
  'Floor Air Cooler EU.webp',
  'Highstore Air Cooler EU.webp',
  'Incoor-H Dry Cooler EU.webp',
  'Indoor-V Dry Cooler EU.webp',
  'Mini COMPACT Air Cooler EU.webp',
  'Slim COMPACT Air Cooler EU.webp',
  'V-Shape Vario HydroBlu_A1.webp',
  'V-shape COMPACT Dry Cooler EU.webp',
  'V-shape VARIO Dry Cooler EU.webp',
  'Vertical COMPACT Dry Cooler EU.webp',
  'Vertical VARIO Dry Cooler EU.webp',
]

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q      = getQuery(event)
  const filter = typeof q.filter === 'string' ? q.filter : 'eu'

  const dir = join(process.cwd(), 'public', 'images', 'products')
  if (!existsSync(dir)) {
    // Serverless / Vercel: return known EU hero list as fallback
    return {
      ok: true,
      fallback: true,
      images: EU_FALLBACK.map(f => `/images/products/${f}`),
    }
  }

  const all   = readdirSync(dir)
  const files = filter === 'eu'
    ? all.filter(f => /EU\.(png|webp)$/i.test(f))
    : all.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))

  return {
    ok: true,
    fallback: false,
    images: files.sort().map(f => `/images/products/${f}`),
  }
})
