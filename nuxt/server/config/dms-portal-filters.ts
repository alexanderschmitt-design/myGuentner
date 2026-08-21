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
  /** DisplayName-Aliases für den Fallback-Schema-Lookup. */
  aliases?: string[]
  /**
   * Liste von d.velop-Property-Key-Kandidaten. Der Server probiert sie der
   * Reihe nach via `getFacetValues()` — die erste, die Werte liefert,
   * gewinnt und wird gecached. Kombiniert typische d.velop-Naming-
   * Konventionen (`property_<name>`, `<name>`) mit numerischen IDs.
   */
  candidatePropertyIds: string[]
}

export const PORTAL_PUBLIC_DOCUMENTS_FILTERS: PortalFilterDef[] = [
  {
    frontendField: 'documentType',
    label: 'Document Type',
    aliases: ['Dokumententyp'],
    candidatePropertyIds: ['128', 'property_document_type', 'property_documenttype', 'document_type', 'documenttype', 'Document Type']
  },
  {
    frontendField: 'permission',
    label: 'Permission',
    aliases: ['Berechtigung'],
    candidatePropertyIds: ['property_permission', 'permission', 'Permission']
  },
  {
    frontendField: 'brand',
    label: 'Brand',
    aliases: ['Marke'],
    candidatePropertyIds: ['property_brand', 'brand', 'Brand']
  },
  {
    frontendField: 'region',
    label: 'Region',
    candidatePropertyIds: ['property_region', 'region', 'Region']
  },
  {
    frontendField: 'languagePortal',
    label: 'Language Portal',
    aliases: ['Language', 'Sprache', 'Portal Language'],
    candidatePropertyIds: ['property_language_portal', 'property_languageportal', 'property_language', 'language_portal', 'languageportal', 'language', 'Language Portal', 'Language']
  },
  {
    frontendField: 'productCategory',
    label: 'Product Category',
    aliases: ['Produkt-Kategorie'],
    candidatePropertyIds: ['property_product_category', 'property_productcategory', 'product_category', 'productcategory', 'Product Category']
  },
  {
    frontendField: 'productLevel1',
    label: 'Product Level 1',
    aliases: ['Product Level', 'Produkt-Level 1'],
    candidatePropertyIds: ['property_product_level_1', 'property_productlevel1', 'property_product_level1', 'product_level_1', 'productlevel1', 'Product Level 1']
  },
  {
    frontendField: 'productGroup',
    label: 'Product Group',
    aliases: ['Produkt-Gruppe'],
    candidatePropertyIds: ['property_product_group', 'property_productgroup', 'product_group', 'productgroup', 'Product Group']
  },
  {
    frontendField: 'productFamily',
    label: 'Product Family',
    aliases: ['Produkt-Familie'],
    candidatePropertyIds: ['property_product_family', 'property_productfamily', 'product_family', 'productfamily', 'Product Family']
  },
  {
    frontendField: 'productSeries',
    label: 'Product Series',
    aliases: ['Produkt-Serie'],
    candidatePropertyIds: ['property_product_series', 'property_productseries', 'product_series', 'productseries', 'Product Series']
  }
]

export const PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID = 'DMANU'
