const PRIORITY: Record<string, number> = {
  'COMPACT':              1,
  'VARIO':                2,
  'APPLICATION SPECIFIC': 3,
}

function linePriority(subcategory: string | null | undefined): number {
  const key = (subcategory ?? '').toUpperCase().trim()
  return PRIORITY[key] ?? 4
}

export function sortCatalogProducts<T extends { subcategory: string | null; product_name: string }>(
  products: T[]
): T[] {
  return [...products].sort((a, b) => {
    const pa = linePriority(a.subcategory)
    const pb = linePriority(b.subcategory)
    if (pa !== pb) return pa - pb
    return a.product_name.localeCompare(b.product_name, undefined, { sensitivity: 'base' })
  })
}
