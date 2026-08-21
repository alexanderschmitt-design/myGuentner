/**
 * Statische Filter-Definition für Portal Public Documents (DMANU).
 *
 * Spiegelt 1:1 die 10 Filter-Dropdowns aus der d.velop-Browser-Suche
 * ("Search in Productive → Portal Public Documents"). Reihenfolge folgt
 * den Screenshots des Product Owners (2026-08-21).
 *
 * Warum statisch statt Auto-Discovery?
 *  • Auto-Discovery via Live-Search-Sampling ist im Kaltstart 5–8s langsam
 *    → schlechte UX bei jedem Öffnen der /admin/dms-Seite.
 *  • Die 10 Filter sind produktseitig stabil — sie ändern sich selten.
 *
 * Warum trotzdem keine hard-coded Property-IDs?
 *  • Die IDs (numerisch / UUID) sind pro Guentner-DMS-Tenant unterschiedlich
 *    und im Code-Repo nicht bekannt. Wir resolven sie beim ersten Aufruf
 *    einmalig aus dem d.velop-Schema (via displayName-Match), cachen das
 *    Mapping 6h in `filter-values.get.ts`.
 *
 * Weitere ObjectDefinitions könnten hier später mit eigenen Filter-Sets
 * hinzukommen (z.B. `DOSUD` = Product Dossier). Bis dahin: DMANU-only.
 */

export interface PortalFilterDef {
  /** Frontend-Feldname (URL-Query, Client-Store) */
  frontendField: string
  /** Anzeige-Label im UI (matches d.velop displayName exakt oder Alias) */
  label: string
  /** Weitere d.velop-Aliases, falls der displayName leicht abweicht.
   *  Beim Property-ID-Lookup wird case-insensitive gegen diese Liste + `label` gematched. */
  aliases?: string[]
  /** Optionale Property-ID-Hints (falls bereits bekannt) — überspringt Discovery. */
  knownPropertyId?: string
}

export const PORTAL_PUBLIC_DOCUMENTS_FILTERS: PortalFilterDef[] = [
  { frontendField: 'documentType',    label: 'Document Type',    aliases: ['Dokumententyp'], knownPropertyId: '128' },
  { frontendField: 'permission',      label: 'Permission',       aliases: ['Berechtigung'] },
  { frontendField: 'brand',           label: 'Brand',            aliases: ['Marke'] },
  { frontendField: 'region',          label: 'Region' },
  { frontendField: 'languagePortal',  label: 'Language Portal',  aliases: ['Language', 'Sprache'] },
  { frontendField: 'productCategory', label: 'Product Category', aliases: ['Produkt-Kategorie'] },
  { frontendField: 'productLevel1',   label: 'Product Level 1',  aliases: ['Product Level', 'Produkt-Level 1'] },
  { frontendField: 'productGroup',    label: 'Product Group',    aliases: ['Produkt-Gruppe'] },
  { frontendField: 'productFamily',   label: 'Product Family',   aliases: ['Produkt-Familie'] },
  { frontendField: 'productSeries',   label: 'Product Series',   aliases: ['Produkt-Serie'] }
]

export const PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID = 'DMANU'
