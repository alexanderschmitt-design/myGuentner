/**
 * fluidIdMap — Statische Zuordnung der numerischen GPC-EU-FluidIDs zu den
 * String-Slugs, die im Wizard-Store als `refrigerant` bzw. `glycolType`
 * gespeichert werden.
 *
 * Warum überhaupt eine statische Tabelle: die GPC-EU-Fluids-API liefert
 * pro Kategorie eine Liste `{ fluidID, fluidName, hasImpact }`. Die
 * Backend-Default-Fixtures (nuxt/public/productCategoryN.json) referenzieren
 * Fluids nur über ihre numerische ID. Beim Hydrate der Fixture-Defaults muss
 * die ID auf den passenden Store-Slug übersetzt werden, damit das Fluid-
 * Dropdown die richtige Option vorwählt — auch wenn die Live-Fluid-API
 * (noch) nicht geantwortet hat.
 *
 * Quelle der IDs: DevTools-Snapshot der Live-App myguntner.com pro Kategorie,
 * abgelegt in nuxt/public/productCategoryN.json.
 */

export type FluidMediumType = 'refrigerant' | 'liquid'

export interface FluidEntry {
  /** Wert wie er im Store landet (matcht die Option-Values im Dropdown). */
  slug: string
  /** Für den Store-Umschalter refrigerant ↔ glycolType. */
  mediumType: FluidMediumType
}

/**
 * Bekannte fluidID → slug-Zuordnungen. Für nicht gelistete IDs fällt
 * `fluidIdToSlug()` auf die ID als String zurück (kompatibel mit
 * thermodynamics.vue:190-193, das den fluidID-String als value nimmt
 * wenn kein R-Code im Label steht — trifft z. B. Öl / Sole zu).
 *
 * Konvention pro fluidID:
 *   • R-codierte Fluids (Refrigerants) → R-Nummer als Slug ("R717",
 *     "R744", "R404A" …). Sowohl die Live-Fluid-API als auch das
 *     Fallback-Dropdown extrahieren R-Codes aus dem Label und benutzen
 *     sie als Option-Value → Match garantiert.
 *   • Nicht-R-codierte Fluids (Coolants, Öle) → die fluidID als String.
 *     Das matcht die Live-API-Konvention (`String(f.fluidID)` in
 *     thermodynamics.vue:197). Der LIQUID_FALLBACK muss dieselbe
 *     Konvention nutzen — siehe fluidCanonicalSlug() in demselben File.
 */
export const FLUID_ID_MAP: Record<number, FluidEntry> = {
  // Sole / Glykol / Coolants (Cat 2 Air Cooler + Cat 4 Dry Cooler)
  4:    { slug: 'ethylene',  mediumType: 'liquid' },
  5:    { slug: 'propylene', mediumType: 'liquid' },
  6:    { slug: 'ethanol',   mediumType: 'liquid' },
  7:    { slug: 'water',     mediumType: 'liquid' },
  8:    { slug: 'brineNaCl', mediumType: 'liquid' },
  9:    { slug: 'brineCaCl2',mediumType: 'liquid' },
  // Refrigerants — Naturals (Impact)
  41:   { slug: 'R744',      mediumType: 'refrigerant' }, // CO₂ (Cat 10 Gas cooler)
  2009: { slug: 'R717',      mediumType: 'refrigerant' }, // NH₃ (Cat 1 Evaporator Pump)
  2010: { slug: 'R744',      mediumType: 'refrigerant' }, // Cat 0 Evaporator DX default
  2020: { slug: 'R290',      mediumType: 'refrigerant' }, // Propane
  2021: { slug: 'R600',      mediumType: 'refrigerant' }, // Butane
  2022: { slug: 'R600a',     mediumType: 'refrigerant' }, // Isobutane
  2023: { slug: 'R1270',     mediumType: 'refrigerant' }, // Propene
  // Refrigerants — HFOs (mid GWP)
  2030: { slug: 'R1234yf',   mediumType: 'refrigerant' },
  2031: { slug: 'R1234ze',   mediumType: 'refrigerant' },
  2032: { slug: 'R1233zd',   mediumType: 'refrigerant' },
  // Refrigerants — HFC-Blends (Non-Impact)
  2012: { slug: 'R404A',     mediumType: 'refrigerant' }, // Cat 3 Condenser, Cat 5 Subcooler
  2013: { slug: 'R448A',     mediumType: 'refrigerant' },
  2014: { slug: 'R449A',     mediumType: 'refrigerant' },
  2015: { slug: 'R452A',     mediumType: 'refrigerant' },
  2016: { slug: 'R452B',     mediumType: 'refrigerant' },
  2017: { slug: 'R454A',     mediumType: 'refrigerant' },
  2018: { slug: 'R454B',     mediumType: 'refrigerant' },
  2019: { slug: 'R454C',     mediumType: 'refrigerant' },
  2040: { slug: 'R455A',     mediumType: 'refrigerant' },
  2041: { slug: 'R513A',     mediumType: 'refrigerant' },
  2042: { slug: 'R515B',     mediumType: 'refrigerant' },
  2050: { slug: 'R32',       mediumType: 'refrigerant' },
  2051: { slug: 'R134a',     mediumType: 'refrigerant' },
  2052: { slug: 'R407A',     mediumType: 'refrigerant' },
  2053: { slug: 'R407C',     mediumType: 'refrigerant' },
  2054: { slug: 'R407F',     mediumType: 'refrigerant' },
  2055: { slug: 'R408A',     mediumType: 'refrigerant' },
  2056: { slug: 'R409A',     mediumType: 'refrigerant' },
  2057: { slug: 'R410A',     mediumType: 'refrigerant' },
  2058: { slug: 'R469A',     mediumType: 'refrigerant' },
  2059: { slug: 'R502',      mediumType: 'refrigerant' },
  2060: { slug: 'R507A',     mediumType: 'refrigerant' },
  2061: { slug: 'R508B',     mediumType: 'refrigerant' }
}

/**
 * Reverse-Lookup: von Store-Slug ('R744', 'ethylene') zurück zur
 * numerischen fluidID. Wird beim Payload-Build für den findUnits-Call
 * benötigt — die API erwartet FluidID als Zahl, im Store liegt nur der
 * Slug. Erste ID mit passendem Slug (+ optional mediumType) gewinnt,
 * damit Cat-spezifische Duplikate (z. B. R744 in id=41 und id=2010)
 * konsistent auflösen.
 *
 * NOTE: Die IDs außerhalb der bekannten Naturals + Cat-Defaults sind
 * spekulativ und müssen bei Bedarf durch echte Fluids-API-Werte
 * ersetzt werden — siehe /fluids Live-Endpoint. Bis dahin ist ein
 * FluidID-Miss besser sichtbar (Diagnose-Panel zeigt FluidID: null)
 * als schlecht (falsche numerische ID → API antwortet mit falschem
 * Fluid oder Fehler).
 */
export function slugToFluidId(
  slug: string | null | undefined,
  expectedMediumType?: FluidMediumType,
  catId?: number
): number | null {
  if (!slug) return null
  // Kategorien-spezifische Overrides für mehrdeutige Slugs: derselbe
  // Fluid-Slug kann in verschiedenen Kategorien unterschiedliche
  // fluidIDs haben (z. B. R744 = 41 in Cat 10 Gas Cooler, aber = 2010
  // in Cat 0 Evaporator DX). Hier explizit auflösen — sonst fällt der
  // generische Lookup auf die Reverse-Iteration (2xxx wins) zurück.
  const override = catId !== undefined ? CATEGORY_FLUID_OVERRIDES[catId]?.[slug] : undefined
  if (override !== undefined) return override
  // Generischer Lookup: die 2xxx-IDs sind neuere Convention, die 4x-IDs
  // Legacy — mit reverse Iteration gewinnen die neueren.
  const entries = Object.entries(FLUID_ID_MAP).sort(([a], [b]) => Number(b) - Number(a))
  for (const [id, entry] of entries) {
    if (entry.slug !== slug) continue
    if (expectedMediumType && entry.mediumType !== expectedMediumType) continue
    return Number(id)
  }
  return null
}

/**
 * Kategorien-spezifische FluidID-Overrides für Slugs, die je nach
 * Kategorie eine andere ID brauchen. Werte aus den Fixture-Snapshots
 * `nuxt/public/productCategoryN.json` bzw. der Live-API-Response.
 */
const CATEGORY_FLUID_OVERRIDES: Record<number, Record<string, number>> = {
  // Cat 10 (Gas Cooler CO₂) — R744 hat die Legacy-ID 41
  10: { R744: 41 }
}

/**
 * Übersetzt eine fluidID in den Store-Slug. Unbekannte IDs kommen als
 * String zurück (dann muss die Live-Fluid-API die Option liefern, damit
 * das Dropdown matcht — Fallback-Verhalten identisch zur Compute-Logik
 * in thermodynamics.vue:190-193).
 *
 * `expectedMediumType` erlaubt kontextabhängige Disambiguierung: dieselbe
 * numerische fluidID kann in unterschiedlichen Kategorien ein anderes
 * Fluid bezeichnen (z. B. 2012 ist in Cat 3 = R404A, in Cat 5 aber ein
 * Coolant). Wenn der Aufrufer die erwartete mediumType kennt und die
 * statische Map einen anderen Typ zurückgibt, fallen wir auf die ID als
 * String zurück — dann matcht die vom Live-Fluid-API gelieferte Option.
 */
/**
 * Kanonische Slug-Ableitung aus einem Live-API-Fluid-Eintrag (fluidID +
 * Label). Wird sowohl vom Dropdown-Builder in thermodynamics.vue als auch
 * vom `legacyParametersFromUnitInputData()`-Mapper genutzt, damit
 * Store-Wert und Dropdown-Option-Value garantiert übereinstimmen.
 *
 * Regel:
 *   1) Label enthält "(Rxxx…)" → R-Code als Slug ("R744").
 *   2) FLUID_ID_MAP kennt diese fluidID → dessen Slug ('ethylene', …).
 *   3) Sonst → fluidID als String ("1002" für unbekannte Öle etc.).
 *
 * Damit sind für gängige Fluids die menschenlesbaren Slugs kanonisch
 * ('ethylene', 'R717', …) — das matcht sowohl den Fallback als auch die
 * hardcoded Q&A- / Home-Card-Prefills, die diese Slugs seit jeher nutzen.
 */
export function fluidCanonicalSlug(
  fluidID: number | null | undefined,
  label: string,
  expectedMediumType?: FluidMediumType
): string | null {
  if (fluidID === null || fluidID === undefined) return null
  const codeMatch = String(label ?? '').match(/\((R\d{2,4}[A-Za-z]?)\)/)
  if (codeMatch) return codeMatch[1]
  const known = FLUID_ID_MAP[fluidID]
  // FLUID_ID_MAP nur nutzen wenn der Eintrag zum erwarteten mediumType
  // passt. Ansonsten Fallback auf die ID als String — z. B. fluidID 2012
  // ist Cat-3-seitig R404A (refrigerant), Cat-5-seitig aber ein Coolant.
  if (known && (!expectedMediumType || known.mediumType === expectedMediumType)) {
    return known.slug
  }
  return String(fluidID)
}

export function fluidIdToSlug(
  id: number | null | undefined,
  expectedMediumType?: FluidMediumType
): FluidEntry | null {
  if (id === null || id === undefined) return null
  const hit = FLUID_ID_MAP[id]
  if (hit) {
    if (!expectedMediumType || hit.mediumType === expectedMediumType) return hit
    // Statische Map und Kategorie widersprechen sich — dann wissen wir
    // ohne Live-Daten nicht, welche Fluid dahinter steht. Slug = ID.
    return { slug: String(id), mediumType: expectedMediumType }
  }
  // Unbekannt: Slug = ID als String, mediumType folgt der erwarteten
  // Kategorie (oder 'liquid' als konservativer Default).
  return { slug: String(id), mediumType: expectedMediumType ?? 'liquid' }
}
