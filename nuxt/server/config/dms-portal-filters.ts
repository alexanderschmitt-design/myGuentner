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

/**
 * Property-IDs verifiziert am 2026-08-21 aus dmsobjectPropFacet-Discovery
 * auf dms-prod.guentner.com. Erste ID pro Filter ist der numerische d.velop-
 * Property-Key aus dem Live-Sample. Fallback-Kandidaten dienen als Safety-Net
 * falls die Tenant-Konfiguration ändert.
 */
export const PORTAL_PUBLIC_DOCUMENTS_FILTERS: PortalFilterDef[] = [
  {
    frontendField: 'documentType',
    label: 'Document Type',
    aliases: ['Dokumententyp'],
    candidatePropertyIds: ['49', 'ac4c7c21-429a-48aa-afda-735d24e229c3', 'property_document_type']
  },
  {
    frontendField: 'permission',
    label: 'Permission',
    aliases: ['Berechtigung'],
    candidatePropertyIds: ['53', '6d149f2a-7074-42fd-bb3a-8b8f02be95cf', 'property_permission']
  },
  {
    frontendField: 'brand',
    label: 'Brand',
    aliases: ['Marke'],
    candidatePropertyIds: ['46', 'd1679c7d-2c04-49fc-91a2-25d82c3ef0f1', 'property_brand']
  },
  {
    frontendField: 'region',
    label: 'Region',
    candidatePropertyIds: ['45', '1607a4e5-2ff7-41a7-8e27-b105d73494a7', 'property_region']
  },
  {
    frontendField: 'languagePortal',
    label: 'Language Portal',
    aliases: ['Language', 'Sprache', 'Portal Language'],
    candidatePropertyIds: ['29', '3479ee0b-b9c5-420f-9286-4b04a8c9f390', 'property_language']
  },
  {
    frontendField: 'productCategory',
    label: 'Product Category',
    aliases: ['Produkt-Kategorie'],
    candidatePropertyIds: ['127', '6bae9767-aafa-461c-a62b-5da1b1e2e88e', 'property_product_category']
  },
  {
    frontendField: 'productLevel1',
    label: 'Product Level 1',
    aliases: ['Product Level', 'Produkt-Level 1'],
    candidatePropertyIds: ['125', '82d8cb4f-726a-4969-b6bf-0f35ab44dc71', 'property_product_level_1']
  },
  {
    frontendField: 'productGroup',
    label: 'Product Group',
    aliases: ['Produkt-Gruppe'],
    candidatePropertyIds: ['158', '4114b3b7-7ef2-4be2-a66e-0f2bd3d0894e', 'property_product_group']
  },
  {
    frontendField: 'productFamily',
    label: 'Product Family',
    aliases: ['Produkt-Familie'],
    candidatePropertyIds: ['126', 'b9596d0b-1a37-4260-846b-0ef5ef63c1e5', 'property_product_family']
  },
  {
    frontendField: 'productSeries',
    label: 'Product Series',
    aliases: ['Produkt-Serie'],
    candidatePropertyIds: ['124', '3227628d-c867-484f-a151-626d57b88a74', 'property_product_series']
  }
]

export const PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID = 'DMANU'
