/**
 * DMS-Property-Mapping (P2#11)
 * =============================
 *
 * Ergebnis der Property-Discovery via `node scripts/probe-dms-properties.mjs`
 * gegen dms-prod.guentner.com (2026-08-12).
 *
 * Realität: Die klassischen 5 Cascading-Dropdowns Category/Level/Group/Family/
 * Series aus dem Legacy-rag-server existieren so **nicht** im Güntner-DMS. Das
 * DMS ist dokumentzentrisch (Order/Project/Customer), nicht produkt-zentrisch.
 *
 * Pragmatisches Mapping — 5 sinnvolle Filter, die die tatsächliche DMS-
 * Struktur widerspiegeln:
 *
 *   1. objectCategory  — `sourceCategories[0]` (DMS-ObjectDefinition-ID,
 *                        z. B. DOSUD, APROD, ATECD, DONAS, DTECS, DTECC)
 *   2. documentType    — Property `128` (Freitext-Kategorie:
 *                        "Drawing", "Controls ID", "Customs Documentation")
 *   3. productRef      — Property `17` bzw. `112`
 *                        ("FACS2 adiabatic condenser", "APPLICATION HIGH DENSITY")
 *   4. customer        — Property `98` bzw. UUID `01868e5c-bb85-4f13-b222-9baac5528099`
 *                        (Kundenname, z. B. "NTT Global Data Centers EMEA Ltd")
 *   5. state           — Property `property_state` (z. B. "Released")
 *
 * Diese Config ist die einzige Stelle, an der die kryptischen DMS-Property-
 * IDs auftauchen — API-Konsumenten arbeiten mit den Frontend-Namen.
 */

export interface DmsPropertyMapping {
  /** UI-freundlicher Schlüssel */
  frontendField: string
  /** Anzeige-Label im UI */
  label: string
  /** Kurzbeschreibung im UI (Placeholder / Tooltip) */
  hint: string
  /** DMS-Property-Keys (mehrere zulassen wegen Duplikaten unter numerischer + UUID-Notation) */
  dmsPropertyIds: string[]
  /**
   * Kategorie-Filter geht über `sourcecategories`, nicht `properties[...]`.
   * Wenn true, ist `dmsPropertyIds` leer und der Wert wird als sourceCategory
   * eingesetzt.
   */
  isSourceCategory?: boolean
}

export const DMS_PROPERTY_MAP: DmsPropertyMapping[] = [
  {
    frontendField: 'objectCategory',
    label: 'Dokumenten-Kategorie',
    hint: 'DMS-Objekttyp (z. B. Product Dossier, Technical Documents)',
    dmsPropertyIds: [],
    isSourceCategory: true
  },
  {
    frontendField: 'documentType',
    label: 'Dokumententyp',
    hint: 'Konkrete Dokument-Klasse (z. B. Drawing, Controls ID)',
    dmsPropertyIds: ['128']
  },
  {
    frontendField: 'productRef',
    label: 'Produkt-Referenz',
    hint: 'Produkttyp aus dem Dokument (z. B. FACS2 adiabatic condenser)',
    dmsPropertyIds: ['17', '112', '06f0a6fe-4e6a-4455-8730-ade3e5b3fe15']
  },
  {
    frontendField: 'customer',
    label: 'Kunde',
    hint: 'Endkunde/Konzern (z. B. NTT Global Data Centers)',
    dmsPropertyIds: ['98', '01868e5c-bb85-4f13-b222-9baac5528099']
  },
  {
    frontendField: 'state',
    label: 'Status',
    hint: 'Freigabestatus im DMS (Released, In Review, …)',
    dmsPropertyIds: ['property_state']
  }
]

/** Liefert die primäre DMS-Property-ID für ein Frontend-Feld (oder null). */
export function getPrimaryDmsPropertyId(frontendField: string): string | null {
  const m = DMS_PROPERTY_MAP.find((p) => p.frontendField === frontendField)
  return m?.dmsPropertyIds?.[0] ?? null
}

/** Prüft, ob ein Frontend-Feld über sourceCategories statt properties[] geht. */
export function isSourceCategoryField(frontendField: string): boolean {
  return DMS_PROPERTY_MAP.find((p) => p.frontendField === frontendField)?.isSourceCategory === true
}

/**
 * Übersetzt einen Frontend-Filter-Record in das, was `searchDocuments()` erwartet:
 *   { categoryId?: string, properties: Record<dmsPropertyId, value> }
 */
export function translateFilters(
  frontendFilters: Record<string, string | number | null | undefined>
): { categoryId?: string; properties: Record<string, string> } {
  const properties: Record<string, string> = {}
  let categoryId: string | undefined

  for (const [key, value] of Object.entries(frontendFilters)) {
    if (value === null || value === undefined || value === '') continue
    const mapping = DMS_PROPERTY_MAP.find((p) => p.frontendField === key)
    if (!mapping) continue
    if (mapping.isSourceCategory) {
      categoryId = String(value)
    } else if (mapping.dmsPropertyIds[0]) {
      properties[mapping.dmsPropertyIds[0]] = String(value)
    }
  }

  return { categoryId, properties }
}
