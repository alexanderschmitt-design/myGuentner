/**
 * POST /api/admin/products/sync-images
 *
 * Scans /public/images/products/ for EU hero images, compares against
 * catalog_products, and inserts missing entries with derived defaults.
 *
 * Body: { dryRun?: boolean }
 * Response: { ok, total, created, skipped, products }
 *
 * NOTE: fs access works in local dev (Node process). In Vercel serverless
 * the public/ directory is not accessible at runtime — the endpoint returns
 * ok: false with a clear error in that case.
 */

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { requireAdmin } from '../../../utils/auth'
import { getSupabaseServiceClient } from '../../../utils/supabase'

interface ProductSeed {
  id: string
  product_name: string
  category: string
  subcategory: string
  series: string
  description: string
  application: string
  features_certifications: string
  url: string
  image_path: string
  is_active: boolean
  is_auto_generated: boolean
}

function inferSeries(lower: string): string {
  if (lower.includes('cubic') && lower.includes('vario'))    return 'GACV'
  if (lower.includes('cubic') && lower.includes('compact'))  return 'GACC'
  if (lower.includes('dual')  && lower.includes('vario'))    return 'ADHN / DGN / DHN'
  if (lower.includes('dual')  && lower.includes('compact'))  return 'GADC'
  if (lower.includes('mini'))                                return 'GAMC'
  if (lower.includes('slim'))                                return 'GASC'
  if (lower.includes('flat')  && lower.includes('vario'))    return 'GCHV / GFHV'
  if (lower.includes('flat')  && lower.includes('compact'))  return 'GCHC / GFHC'
  if (lower.includes('vertical') && lower.includes('vario')) return 'GCVV / GFVV'
  if (lower.includes('vertical') && lower.includes('compact')) return 'GCVC / GFVC'
  if ((lower.includes('v-shape') || lower.includes('v-form')) && lower.includes('vario'))   return 'GCDV / GFD'
  if ((lower.includes('v-shape') || lower.includes('v-form')) && lower.includes('compact')) return 'GCDC / GFDC'
  if (lower.includes('blast'))  return 'GAFB'
  if (lower.includes('agri'))   return 'GACA'
  if (lower.includes('indoor')) return 'Indoor'
  return 'GENERIC'
}

function deriveProduct(filename: string): ProductSeed {
  // Normalise "Incoor-H" typo to "Indoor-H" for consistent naming
  const normFilename = filename.replace(/incoor/i, 'Indoor')

  const stem = normFilename.replace(/\.png$/i, '')         // "Cubic VARIO Air Cooler EU"
  const name = stem.replace(/\s+EU$/i, '').trim()          // "Cubic VARIO Air Cooler"
  const lower = filename.toLowerCase()

  // Category
  let category = 'Condensers'
  if (lower.includes('air cooler')) category = 'Air Coolers'
  else if (lower.includes('dry cooler')) category = 'Dry Coolers'

  // Subcategory
  let subcategory = 'Application Specific'
  if (lower.includes('compact')) subcategory = 'COMPACT'
  else if (lower.includes('vario')) subcategory = 'VARIO'

  // Application & certifications
  let application = 'Commercial & Industrial Cooling'
  let certifications = 'Standard'
  if (category === 'Air Coolers') {
    application = subcategory === 'COMPACT' ? 'Commercial Refrigeration' : 'Industrial Refrigeration'
    certifications = 'NSF'
  } else if (category === 'Dry Coolers') {
    application = 'HVAC & Industrial Cooling'
    certifications = 'ETL'
  } else {
    application = 'Commercial Refrigeration & HVAC'
    certifications = 'UL, Standard'
  }
  if (lower.includes('hydroblu')) certifications += ', hydroBLU™'

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return {
    id: `auto-${slug}`,
    product_name: name,
    category,
    subcategory,
    series: inferSeries(lower),
    description: `Auto-generiert aus Bildbestand (${filename}).`,
    application,
    features_certifications: certifications,
    url: `https://guntner.com/products/${slug}`,
    image_path: `/images/products/${filename}`,
    is_active: true,
    is_auto_generated: true,
  }
}

function productMatchesFile(
  product: { product_name: string; image_path: string | null },
  filename: string
): boolean {
  const lower = filename.toLowerCase()
  // 1. Explicit image_path match
  if (product.image_path && product.image_path.toLowerCase().includes(lower)) return true
  // 2. Product name appears inside the filename (e.g. "Cubic VARIO Air Cooler" in "cubic vario air cooler eu.png")
  const pname = product.product_name.toLowerCase()
  if (lower.includes(pname)) return true
  // 3. Handle "Incoor-H" filename typo — match "Indoor-H" products
  if (lower.includes('incoor') && pname.includes('indoor-h')) return true
  return false
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ dryRun?: boolean }>(event).catch(() => ({}))
  const dryRun = body?.dryRun === true

  // Filesystem access — only works in dev/local Node process
  const imagesDir = join(process.cwd(), 'public', 'images', 'products')
  if (!existsSync(imagesDir)) {
    setResponseStatus(event, 503)
    return {
      ok: false,
      error: `Bilderordner nicht erreichbar (${imagesDir}). Sync funktioniert nur im lokalen Dev-Modus.`,
    }
  }

  // Only EU hero images — skip angle views (_A1–A4) and multi-fan shots
  const euImages = readdirSync(imagesDir).filter(f => /EU\.png$/i.test(f))

  // Load all existing catalog products for matching
  const sb = getSupabaseServiceClient()
  const { data: existing, error: fetchErr } = await sb
    .from('catalog_products')
    .select('id, product_name, image_path')

  if (fetchErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: fetchErr.message }
  }

  const existingProducts = existing ?? []

  const toCreate: ProductSeed[] = []
  const skipped: string[]       = []

  for (const filename of euImages) {
    const matched = existingProducts.some(p => productMatchesFile(p, filename))
    if (matched) {
      skipped.push(filename)
    } else {
      toCreate.push(deriveProduct(filename))
    }
  }

  if (!dryRun && toCreate.length > 0) {
    const { error: insertErr } = await sb
      .from('catalog_products')
      .upsert(toCreate, { onConflict: 'id', ignoreDuplicates: true })

    if (insertErr) {
      setResponseStatus(event, 500)
      return { ok: false, error: insertErr.message }
    }
  }

  return {
    ok: true,
    dryRun,
    total:   euImages.length,
    created: dryRun ? 0 : toCreate.length,
    skipped: skipped.length,
    preview: toCreate.length,   // how many would be / were created
    products: toCreate,
  }
})
