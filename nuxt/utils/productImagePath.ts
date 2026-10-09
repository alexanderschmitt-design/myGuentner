const SERIES_IMAGE_MAP: Record<string, string> = {
  // Air Coolers — COMPACT
  GAMC: 'Mini COMPACT Air Cooler EU.webp',
  GADC: 'Dual COMPACT Air Cooler EU.webp',
  GACC: 'Cubic COMPACT Air Cooler EU.webp',
  GASC: 'Slim COMPACT Air Cooler EU.webp',
  // Air Coolers — VARIO
  GACV: 'Cubic VARIO Air Cooler EU.webp',
  ADHN: 'Dual VARIO Air Cooler EU.webp',
  DGN:  'Dual VARIO Air Cooler EU.webp',
  DHN:  'Dual VARIO Air Cooler EU.webp',
  // Application Specific
  GAFB: 'Blast Air Cooler EU.webp',
  GACA: 'Agri Air Cooler EU.webp',
  // Flat — Dry Coolers
  GCHC: 'Flat COMPACT Dry Cooler EU.webp',
  GFHC: 'Flat COMPACT Dry Cooler EU.webp',
  GGHC: 'Flat COMPACT Dry Cooler EU.webp',
  GOHC: 'Flat COMPACT Dry Cooler EU.webp',
  GSHC: 'Flat COMPACT Dry Cooler EU.webp',
  GCHV: 'Flat VARIO Dry Cooler EU.webp',
  GFHV: 'Flat VARIO Dry Cooler EU.webp',
  GGHV: 'Flat VARIO Dry Cooler EU.webp',
  // Vertical — Dry Coolers
  GCVC: 'Vertical COMPACT Dry Cooler EU.webp',
  GFVC: 'Vertical COMPACT Dry Cooler EU.webp',
  GGVC: 'Vertical COMPACT Dry Cooler EU.webp',
  GOVC: 'Vertical COMPACT Dry Cooler EU.webp',
  GSVC: 'Vertical COMPACT Dry Cooler EU.webp',
  GCVV: 'Vertical VARIO Dry Cooler EU.webp',
  GFVV: 'Vertical VARIO Dry Cooler EU.webp',
  GGVV: 'Vertical VARIO Dry Cooler EU.webp',
  // V-shape — Dry Coolers
  GCDC: 'V-shape COMPACT Dry Cooler EU.webp',
  GFDC: 'V-shape COMPACT Dry Cooler EU.webp',
  GGDC: 'V-shape COMPACT Dry Cooler EU.webp',
  GCDV: 'V-shape VARIO Dry Cooler EU.webp',
  GFD:  'V-shape VARIO Dry Cooler EU.webp',
  GFDV: 'V-shape VARIO Dry Cooler EU.webp',
  GFW:  'V-shape VARIO Dry Cooler EU.webp',
  GVD:  'V-shape VARIO Dry Cooler EU.webp',
  GVW:  'V-shape VARIO Dry Cooler EU.webp',
}

export function getProductImagePath(seriesCode: string): string {
  const filename = SERIES_IMAGE_MAP[seriesCode?.toUpperCase?.() ?? '']
  return filename
    ? `/images/products/${filename}`
    : '/images/products/Floor Air Cooler EU.webp'
}

// ── Curated catalog image resolver ───────────────────────────────────────────
// Maps catalog_products by product_name to the correct EU hero image.
// Falls back to closest shape match; "Incoor-H" typo in filename is intentional.

const CATALOG_IMAGE_RULES: Array<{ test: (n: string) => boolean; file: string }> = [
  // hydroBLU variants (check before generic V-shape)
  { test: n => n.includes('hydroblu'),          file: 'V-Shape Vario HydroBlu_A1.webp' },
  // Air Coolers — named shapes
  { test: n => n.includes('cubic vario'),       file: 'Cubic VARIO Air Cooler EU.webp' },
  { test: n => n.includes('dual vario'),        file: 'Dual VARIO Air Cooler EU.webp' },
  { test: n => n.includes('cubic compact'),     file: 'Cubic COMPACT Air Cooler EU.webp' },
  { test: n => n.includes('dual compact'),      file: 'Dual COMPACT Air Cooler EU.webp' },
  { test: n => n.includes('mini compact'),      file: 'Mini COMPACT Air Cooler EU.webp' },
  { test: n => n.includes('slim compact'),      file: 'Slim COMPACT Air Cooler EU.webp' },
  { test: n => n.includes('blast'),             file: 'Blast Air Cooler EU.webp' },
  { test: n => n.includes('agri'),              file: 'Agri Air Cooler EU.webp' },
  { test: n => n.includes('floor'),             file: 'Floor Air Cooler EU.webp' },
  // Shape-based (Condensers & Dry Coolers share the same geometry images)
  { test: n => n.includes('flat vario'),        file: 'Flat VARIO Dry Cooler EU.webp' },
  { test: n => n.includes('vertical vario'),    file: 'Vertical VARIO Dry Cooler EU.webp' },
  { test: n => n.includes('v-shape vario'),     file: 'V-shape VARIO Dry Cooler EU.webp' },
  { test: n => n.includes('flat compact'),      file: 'Flat COMPACT Dry Cooler EU.webp' },
  { test: n => n.includes('vertical compact'),  file: 'Vertical COMPACT Dry Cooler EU.webp' },
  { test: n => n.includes('v-shape compact'),   file: 'V-shape COMPACT Dry Cooler EU.webp' },
  // Indoor (note: actual filename has typo "Incoor-H")
  { test: n => n.includes('indoor-h'),          file: 'Incoor-H Dry Cooler EU.webp' },
  { test: n => n.includes('indoor-v'),          file: 'Indoor-V Dry Cooler EU.webp' },
  // Fallbacks for specialty products
  { test: n => n.includes('high density'),      file: 'V-shape VARIO Dry Cooler EU.webp' },
  { test: n => n.includes('ecoss') || n.includes('fce'), file: 'Vertical COMPACT Dry Cooler EU.webp' },
  { test: n => n.includes('penthouse') || n.includes('highstore'), file: 'Floor Air Cooler EU.webp' },
  { test: n => n.includes('thermostore') || n.includes('process'), file: 'Cubic COMPACT Air Cooler EU.webp' },
]

export function getCatalogProductImagePath(product: {
  product_name: string
  image_path?: string | null
}): string {
  if (product.image_path) return product.image_path
  const n = product.product_name.toLowerCase()
  for (const rule of CATALOG_IMAGE_RULES) {
    if (rule.test(n)) return `/images/products/${rule.file}`
  }
  return '/images/products/Floor Air Cooler EU.webp'
}
