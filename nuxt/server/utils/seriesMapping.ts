/**
 * variantToCategory — mappt series_variant → {slug, catId} für Template-Generierung.
 * Logik basiert auf seriesCatalog.ts-Einträgen und Suffix-Konvention:
 *   FP-Suffix → Air Cooler (Glycol-Kreislauf)
 *   GG-Präfix → Gas Cooler CO₂
 *   GC/GCF-Präfix → Condenser
 *   GD/GDF/GF-Präfix → Dry Cooler
 *   ADHN / GACV-Sonderfälle → Evaporator Pump
 *   Default → Evaporator DX
 */

export function variantToCategory(seriesVariant: string): { slug: string; catId: number } | null {
  if (!seriesVariant) return null

  const parts = seriesVariant.trim().split(' ')
  const code = parts[0]
  const suffix = parts[1] ?? ''

  if (suffix === 'FP') return { slug: 'air-cooler', catId: 2 }
  if (suffix === 'AP') return { slug: 'evaporator-pump', catId: 1 }

  if (code.startsWith('GG')) return { slug: 'gas-cooler-co2', catId: 10 }

  if (code.startsWith('GCF') || (code.startsWith('GC') && !code.startsWith('GCV')))
    return { slug: 'condenser', catId: 3 }

  if (code.startsWith('GDF') || code.startsWith('GD') || code.startsWith('GF') || code === 'DGN')
    return { slug: 'dry-cooler', catId: 4 }

  if (code === 'ADHN' || code === 'GACV')
    return { slug: 'evaporator-pump', catId: 1 }

  return { slug: 'evaporator-dx', catId: 0 }
}
