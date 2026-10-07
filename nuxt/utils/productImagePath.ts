const SERIES_IMAGE_MAP: Record<string, string> = {
  // Air Coolers — COMPACT
  GAMC: 'Mini COMPACT Air Cooler EU.png',
  GADC: 'Dual COMPACT Air Cooler EU.png',
  GACC: 'Cubic COMPACT Air Cooler EU.png',
  GASC: 'Slim COMPACT Air Cooler EU.png',
  // Air Coolers — VARIO
  GACV: 'Cubic VARIO Air Cooler EU.png',
  ADHN: 'Dual VARIO Air Cooler EU.png',
  DGN:  'Dual VARIO Air Cooler EU.png',
  DHN:  'Dual VARIO Air Cooler EU.png',
  // Application Specific
  GAFB: 'Blast Air Cooler EU.png',
  GACA: 'Agri Air Cooler EU.png',
  // Flat — Dry Coolers
  GCHC: 'Flat COMPACT Dry Cooler EU.png',
  GFHC: 'Flat COMPACT Dry Cooler EU.png',
  GGHC: 'Flat COMPACT Dry Cooler EU.png',
  GOHC: 'Flat COMPACT Dry Cooler EU.png',
  GSHC: 'Flat COMPACT Dry Cooler EU.png',
  GCHV: 'Flat VARIO Dry Cooler EU.png',
  GFHV: 'Flat VARIO Dry Cooler EU.png',
  GGHV: 'Flat VARIO Dry Cooler EU.png',
  // Vertical — Dry Coolers
  GCVC: 'Vertical COMPACT Dry Cooler EU.png',
  GFVC: 'Vertical COMPACT Dry Cooler EU.png',
  GGVC: 'Vertical COMPACT Dry Cooler EU.png',
  GOVC: 'Vertical COMPACT Dry Cooler EU.png',
  GSVC: 'Vertical COMPACT Dry Cooler EU.png',
  GCVV: 'Vertical VARIO Dry Cooler EU.png',
  GFVV: 'Vertical VARIO Dry Cooler EU.png',
  GGVV: 'Vertical VARIO Dry Cooler EU.png',
  // V-shape — Dry Coolers
  GCDC: 'V-shape COMPACT Dry Cooler EU.png',
  GFDC: 'V-shape COMPACT Dry Cooler EU.png',
  GGDC: 'V-shape COMPACT Dry Cooler EU.png',
  GCDV: 'V-shape VARIO Dry Cooler EU.png',
  GFD:  'V-shape VARIO Dry Cooler EU.png',
  GFDV: 'V-shape VARIO Dry Cooler EU.png',
  GFW:  'V-shape VARIO Dry Cooler EU.png',
  GVD:  'V-shape VARIO Dry Cooler EU.png',
  GVW:  'V-shape VARIO Dry Cooler EU.png',
}

export function getProductImagePath(seriesCode: string): string {
  const filename = SERIES_IMAGE_MAP[seriesCode?.toUpperCase?.() ?? '']
  return filename
    ? `/images/products/${filename}`
    : '/images/products/Floor Air Cooler EU.png'
}

// ── Curated catalog image resolver ───────────────────────────────────────────
// Maps catalog_products by product_name to the correct EU hero image.
// Falls back to closest shape match; "Incoor-H" typo in filename is intentional.

const CATALOG_IMAGE_RULES: Array<{ test: (n: string) => boolean; file: string }> = [
  // hydroBLU variants (check before generic V-shape)
  { test: n => n.includes('hydroblu'),          file: 'V-Shape Vario HydroBlu_A1.png' },
  // Air Coolers — named shapes
  { test: n => n.includes('cubic vario'),       file: 'Cubic VARIO Air Cooler EU.png' },
  { test: n => n.includes('dual vario'),        file: 'Dual VARIO Air Cooler EU.png' },
  { test: n => n.includes('cubic compact'),     file: 'Cubic COMPACT Air Cooler EU.png' },
  { test: n => n.includes('dual compact'),      file: 'Dual COMPACT Air Cooler EU.png' },
  { test: n => n.includes('mini compact'),      file: 'Mini COMPACT Air Cooler EU.png' },
  { test: n => n.includes('slim compact'),      file: 'Slim COMPACT Air Cooler EU.png' },
  { test: n => n.includes('blast'),             file: 'Blast Air Cooler EU.png' },
  { test: n => n.includes('agri'),              file: 'Agri Air Cooler EU.png' },
  { test: n => n.includes('floor'),             file: 'Floor Air Cooler EU.png' },
  // Shape-based (Condensers & Dry Coolers share the same geometry images)
  { test: n => n.includes('flat vario'),        file: 'Flat VARIO Dry Cooler EU.png' },
  { test: n => n.includes('vertical vario'),    file: 'Vertical VARIO Dry Cooler EU.png' },
  { test: n => n.includes('v-shape vario'),     file: 'V-shape VARIO Dry Cooler EU.png' },
  { test: n => n.includes('flat compact'),      file: 'Flat COMPACT Dry Cooler EU.png' },
  { test: n => n.includes('vertical compact'),  file: 'Vertical COMPACT Dry Cooler EU.png' },
  { test: n => n.includes('v-shape compact'),   file: 'V-shape COMPACT Dry Cooler EU.png' },
  // Indoor (note: actual filename has typo "Incoor-H")
  { test: n => n.includes('indoor-h'),          file: 'Incoor-H Dry Cooler EU.png' },
  { test: n => n.includes('indoor-v'),          file: 'Indoor-V Dry Cooler EU.png' },
  // Fallbacks for specialty products
  { test: n => n.includes('high density'),      file: 'V-shape VARIO Dry Cooler EU.png' },
  { test: n => n.includes('ecoss') || n.includes('fce'), file: 'Vertical COMPACT Dry Cooler EU.png' },
  { test: n => n.includes('penthouse') || n.includes('highstore'), file: 'Floor Air Cooler EU.png' },
  { test: n => n.includes('thermostore') || n.includes('process'), file: 'Cubic COMPACT Air Cooler EU.png' },
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
  return '/images/products/Floor Air Cooler EU.png'
}
