/**
 * useDmsPortalFilterTree — lädt `public/Product Parameters - myGuentner.csv`
 * und stellt eine Kaskaden-Filter-Logik für Portal Public Documents bereit.
 *
 * Die CSV hat 5 Kaskaden-Spalten:
 *   Product Category → Product Level 1 → Product Group → Product Family → Product Series
 *
 * Reihen mit leeren Zellen werden als "gilt für alle Werte im übergeordneten
 * Level" interpretiert (siehe Zeile 291-298 der CSV: `;PLATE;PLATE;;`).
 *
 * Die 5 kaskadierten Frontend-Field-Namen entsprechen 1:1 dem statischen
 * Filter-Set in nuxt/server/config/dms-portal-filters.ts.
 */

const CASCADE_FIELDS = ['productCategory', 'productLevel1', 'productGroup', 'productFamily', 'productSeries'] as const
type CascadeField = typeof CASCADE_FIELDS[number]

interface TreeRow {
  productCategory: string | null
  productLevel1: string | null
  productGroup: string | null
  productFamily: string | null
  productSeries: string | null
}

const state = {
  rows: null as TreeRow[] | null,
  loading: false as boolean,
  loaded: false as boolean
}

function parseCsv(text: string): TreeRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  // Header überspringen (Zeile 1)
  const rows: TreeRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(';').map((c) => c.trim())
    // Leere Zellen als null (wildcard für Kaskade — matched alle Parent-Werte)
    const row: TreeRow = {
      productCategory: cells[0] || null,
      productLevel1:   cells[1] || null,
      productGroup:    cells[2] || null,
      productFamily:   cells[3] || null,
      productSeries:   cells[4] || null
    }
    // Komplett-leere Zeilen skippen
    if (!row.productCategory && !row.productLevel1 && !row.productGroup && !row.productFamily && !row.productSeries) continue
    rows.push(row)
  }
  return rows
}

export function useDmsPortalFilterTree() {
  const rowsRef = useState<TreeRow[] | null>('dms-portal-filter-tree', () => state.rows)

  async function ensureLoaded() {
    if (state.loaded || state.loading) return
    state.loading = true
    try {
      const text = await $fetch<string>('/Product Parameters - myGuentner.csv', {
        // CSV kommt als text/csv — Nitro/ofetch default JSON-Parsing würde
        // scheitern; responseType 'text' forciert String-Return.
        responseType: 'text'
      })
      state.rows = parseCsv(text)
      rowsRef.value = state.rows
      state.loaded = true
    } catch (err) {
      console.warn('[useDmsPortalFilterTree] CSV load failed:', err)
      state.rows = []
      rowsRef.value = []
      state.loaded = true
    } finally {
      state.loading = false
    }
  }

  /**
   * Liefert die verfügbaren Werte für ein Kaskaden-Feld, gegeben die aktuell
   * gesetzten Filter (activeFilters). Ein null-Wert in einer Row wird als
   * Wildcard behandelt — matched jeden konkreten Parent-Wert.
   */
  function allowedValuesFor(field: CascadeField, activeFilters: Record<string, string>): Set<string> {
    if (!rowsRef.value) return new Set()
    const out = new Set<string>()
    outer: for (const row of rowsRef.value) {
      // Prüfe alle Cascade-Parents des Feldes gegen active
      const fieldIdx = CASCADE_FIELDS.indexOf(field)
      for (let i = 0; i < fieldIdx; i++) {
        const parentField = CASCADE_FIELDS[i]
        const active = activeFilters[parentField]
        if (!active) continue
        const rowVal = row[parentField]
        // Wildcard (null) matched jeden Aktive-Wert
        if (rowVal !== null && rowVal !== active) continue outer
      }
      const v = row[field]
      if (v) out.add(v)
    }
    return out
  }

  /**
   * Filtert eine Options-Liste (frontend-Field → verfügbare Werte aus DMS)
   * gegen die Kaskaden-Regeln. Werte die im DMS existieren aber laut CSV
   * nicht in dieser Kombination vorkommen, werden ausgeblendet.
   */
  function filterOptions(
    field: CascadeField,
    dmsOptions: Array<{ value: string; label: string; count?: number }>,
    activeFilters: Record<string, string>
  ): Array<{ value: string; label: string; count?: number }> {
    if (!rowsRef.value || rowsRef.value.length === 0) return dmsOptions
    const allowed = allowedValuesFor(field, activeFilters)
    if (allowed.size === 0) return dmsOptions  // Kaskade nicht anwendbar → alle zeigen
    return dmsOptions.filter((o) => allowed.has(o.value))
  }

  return {
    rows: rowsRef,
    ensureLoaded,
    allowedValuesFor,
    filterOptions,
    isCascadeField: (field: string): field is CascadeField => (CASCADE_FIELDS as readonly string[]).includes(field)
  }
}
