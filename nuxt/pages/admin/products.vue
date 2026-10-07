<script setup lang="ts">
/**
 * /admin/products — Produkt-Hub: Serien · Produkte · Ersatzteile.
 *
 * Tab "Serien":     Chatbot-Intro, Dokumente, Templates pro Serie.
 * Tab "Produkte":   Importierter CSV-Katalog — durchsuchbar, nach Serie filterbar.
 * Tab "Ersatzteile": Importiertes Spare-Part-Price-Book — durchsuchbar.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { SERIES_CATALOG } from '~/data/seriesCatalog'
import { CATEGORIES } from '~/composables/useCategory'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Produkte & Ersatzteile' })

// ---- Tab-State ----
const activeTab = ref<'serien' | 'produkte' | 'ersatzteile' | 'katalog'>('serien')
const catalogProductsTotal = ref<number | null>(null)

// ---- Produkte-Tab ----
interface CatalogProduct {
  product_code: string
  series_code: string
  series_variant: string
  type_name: string
  price: number | null
  defrost: string | null
  surface_m2: number | null
  air_volume_m3h: number | null
  power_kw: number | null
  unit_length_mm: number | null
  unit_width_mm: number | null
  unit_height_mm: number | null
  weight_kg: number | null
  fan_technology: string | null
  fin_material: string | null
  source_file: string | null
}

const catalogProducts = ref<CatalogProduct[]>([])
const catalogTotal = ref(0)
const catalogLoading = ref(false)
const catalogSearch = ref('')
const catalogSeries = ref('')
const catalogOffset = ref(0)
const CATALOG_LIMIT = 50

async function loadCatalog() {
  catalogLoading.value = true
  try {
    const params = new URLSearchParams({ limit: String(CATALOG_LIMIT), offset: String(catalogOffset.value) })
    if (catalogSearch.value) params.set('search', catalogSearch.value)
    if (catalogSeries.value) params.set('series', catalogSeries.value)
    const res = await $fetch<{ ok: boolean; products: CatalogProduct[]; total: number }>(
      `/api/admin/products/catalog?${params}`
    )
    if (res.ok) { catalogProducts.value = res.products; catalogTotal.value = res.total }
  } catch (e: any) { toast.error('Fehler Produktkatalog: ' + e.message) }
  catalogLoading.value = false
}

let catalogSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(catalogSearch, () => {
  catalogOffset.value = 0
  if (catalogSearchTimer) clearTimeout(catalogSearchTimer)
  catalogSearchTimer = setTimeout(loadCatalog, 300)
})
watch(catalogSeries, () => { catalogOffset.value = 0; loadCatalog() })

// ---- Ersatzteile-Tab ----
interface SparePart {
  id: number
  code: string
  description: string
  category: string | null
  price: number | null
  price_strike: number | null
  availability: string
  series_codes: string[]
  source: string
}

const spareParts = ref<SparePart[]>([])
const spareTotal = ref(0)
const spareLoading = ref(false)
const spareSearch = ref('')
const spareCategory = ref('')
const spareOffset = ref(0)
const SPARE_LIMIT = 50

async function loadSpareParts() {
  spareLoading.value = true
  try {
    const params = new URLSearchParams({ limit: String(SPARE_LIMIT), offset: String(spareOffset.value) })
    if (spareSearch.value) params.set('search', spareSearch.value)
    if (spareCategory.value) params.set('category', spareCategory.value)
    const res = await $fetch<{ ok: boolean; parts: SparePart[]; total: number }>(
      `/api/admin/spare-parts?${params}`
    )
    if (res.ok) { spareParts.value = res.parts; spareTotal.value = res.total }
  } catch (e: any) { toast.error('Fehler Ersatzteile: ' + e.message) }
  spareLoading.value = false
}

let spareSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(spareSearch, () => {
  spareOffset.value = 0
  if (spareSearchTimer) clearTimeout(spareSearchTimer)
  spareSearchTimer = setTimeout(loadSpareParts, 300)
})
watch(spareCategory, () => { spareOffset.value = 0; loadSpareParts() })

watch(activeTab, (tab) => {
  if (tab === 'produkte' && !catalogProducts.value.length) loadCatalog()
  if (tab === 'ersatzteile' && !spareParts.value.length) loadSpareParts()
  if (tab === 'katalog' && !katalogEntries.value.length) loadKatalogEntries()
})

// ── Sync-State ────────────────────────────────────────────────────────────────
const syncLoading = ref(false)
const syncDryRun = ref(false)
const syncError = ref('')
const syncResult = ref<{
  dryRun: boolean; total: number; preview?: number; created?: number; skipped: number;
  products: { id: string; product_name: string; category: string; subcategory: string }[]
} | null>(null)

async function runSync() {
  syncLoading.value = true; syncError.value = ''; syncResult.value = null
  try {
    const res = await $fetch<{ ok: boolean; dryRun: boolean; total: number; preview?: number; created?: number; skipped: number; products: any[]; error?: string }>(
      '/api/admin/products/sync-images',
      { method: 'POST', body: { dryRun: syncDryRun.value } }
    )
    if (!res.ok) throw new Error(res.error ?? 'Fehler beim Sync')
    syncResult.value = res
    if (!res.dryRun) loadKatalogEntries()
  } catch (e: any) { syncError.value = e.message ?? 'Unbekannter Fehler' }
  syncLoading.value = false
}

function fmtPrice(p: number | null) {
  if (p == null) return '—'
  return p.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
function fmtNum(n: number | null, unit = '') {
  if (n == null) return '—'
  return n.toLocaleString('de-DE') + (unit ? ' ' + unit : '')
}

const toast = useToast()

// ---- Datenstrukturen ----

interface SeriesGroup {
  code: string          // z.B. 'GAMC'
  displayTitle: string  // z.B. 'Mini COMPACT – GAMC'
  subtitle: string
  catIds: number[]
}

interface PriorityParams {
  series_variant?: string[]
  defrost?: string[]
  fan_technology?: string[]
  fin_material?: string[]
}

interface NumericStats {
  min: number
  max: number
  avg: number
  median: number
}

interface SeriesAttributes {
  total: number
  attributes: {
    series_variant: { value: string; count: number }[]
    defrost: { value: string; label: string; count: number }[]
    fan_technology: { value: string; count: number }[]
    fin_material: { value: string; count: number }[]
    power_kw: NumericStats | null
    surface_m2: NumericStats | null
    air_volume_m3h: NumericStats | null
  }
}

interface SeriesMeta {
  introText: string
  docIds: string[]
  templateIds: string[]
  notes: string
  priorityParams: PriorityParams
  updatedAt?: string
}

interface DocOption {
  id: string
  name: string
  type: string
  source: string
}

interface TemplateOption {
  id: string
  name: string
  categorySlug: string
}

// ---- Serien aus Katalog ableiten ----

function buildSeriesGroups(): SeriesGroup[] {
  const map = new Map<string, SeriesGroup>()
  for (const [catIdStr, series] of Object.entries(SERIES_CATALOG)) {
    const catId = parseInt(catIdStr, 10)
    for (const s of series) {
      const code = s.id.split('-')[0].toUpperCase()
      if (!map.has(code)) {
        // Titel bereinigen: "Mini COMPACT – GAMC CX" → "Mini COMPACT – GAMC"
        const cleanTitle = s.title.replace(/\s+[A-Z]{2}$/, '').trim()
        map.set(code, { code, displayTitle: cleanTitle, subtitle: s.subtitle, catIds: [] })
      }
      const group = map.get(code)!
      if (!group.catIds.includes(catId)) group.catIds.push(catId)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
}

const allGroups: SeriesGroup[] = buildSeriesGroups()

// ---- State ----

const dbMeta = ref<Record<string, SeriesMeta>>({})
const loading = ref(true)
const searchText = ref('')
const filterCatId = ref<number | ''>('')

const docOptions = ref<DocOption[]>([])
const tplOptions = ref<TemplateOption[]>([])

// Pro Serie: lokaler Edit-State + Expand-Flag
const expanded = ref<Record<string, boolean>>({})
const editState = ref<Record<string, SeriesMeta>>({})
const saving = ref<Record<string, boolean>>({})
const attrCache = reactive<Record<string, SeriesAttributes | null>>({})
const attrLoading = reactive<Record<string, boolean>>({})

// ---- Computed ----

const filteredGroups = computed(() => {
  let result = allGroups
  if (filterCatId.value !== '') {
    result = result.filter(g => g.catIds.includes(filterCatId.value as number))
  }
  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase()
    result = result.filter(g =>
      g.code.toLowerCase().includes(q) || g.displayTitle.toLowerCase().includes(q)
    )
  }
  return result
})

const categoryOptions = computed(() =>
  CATEGORIES.map(c => ({ id: c.id, label: c.sublabel ? `${c.title} (${c.sublabel})` : c.title }))
)

// ---- Initialisierung ----

async function loadMeta() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; meta: Record<string, SeriesMeta> }>('/api/admin/products')
    if (res.ok) dbMeta.value = res.meta
  } catch (e: any) {
    toast.error('Fehler beim Laden: ' + e.message)
  }
  loading.value = false
}

async function loadDocs() {
  try {
    const res = await $fetch<{ ok: boolean; documents: any[] }>('/api/documents')
    if (res.ok) {
      docOptions.value = res.documents
        .filter((d: any) => d.status === 'ready')
        .map((d: any) => ({ id: d.id, name: d.name || d.filename, type: d.type, source: d.source }))
    }
  } catch { /* ignore */ }
}

async function loadTemplates() {
  try {
    const res = await $fetch<{ ok: boolean; templates: any[] }>('/api/admin/templates')
    if (res.ok) {
      tplOptions.value = res.templates.map((t: any) => ({
        id: t.id, name: t.name, categorySlug: t.categorySlug
      }))
    }
  } catch { /* ignore */ }
}

onMounted(() => {
  loadMeta()
  loadDocs()
  loadTemplates()
})

// ---- Hilfsfunktionen ----

function getMeta(code: string): SeriesMeta {
  return dbMeta.value[code] ?? { introText: '', docIds: [], templateIds: [], notes: '', priorityParams: {} }
}

function isEnriched(code: string): boolean {
  const m = dbMeta.value[code]
  return !!m && (!!m.introText || m.docIds.length > 0 || m.templateIds.length > 0)
}

function getEdit(code: string): SeriesMeta {
  if (!editState.value[code]) {
    const m = getMeta(code)
    editState.value[code] = {
      introText: m.introText,
      docIds: [...m.docIds],
      templateIds: [...m.templateIds],
      notes: m.notes,
      priorityParams: { ...(m.priorityParams ?? {}) }
    }
  }
  return editState.value[code]
}

function toggleExpand(code: string) {
  expanded.value[code] = !expanded.value[code]
  if (expanded.value[code]) {
    getEdit(code)
    loadAttributes(code)
  }
}

function catLabel(id: number): string {
  const c = CATEGORIES.find(x => x.id === id)
  if (!c) return `Cat ${id}`
  return c.sublabel ? `${c.title} (${c.sublabel})` : c.title
}

function docName(id: string): string {
  return docOptions.value.find(d => d.id === id)?.name ?? id
}

function tplName(id: string): string {
  return tplOptions.value.find(t => t.id === id)?.name ?? id
}

function toggleDoc(code: string, docId: string) {
  const edit = getEdit(code)
  const idx = edit.docIds.indexOf(docId)
  if (idx >= 0) edit.docIds.splice(idx, 1)
  else edit.docIds.push(docId)
}

function toggleTemplate(code: string, tplId: string) {
  const edit = getEdit(code)
  const idx = edit.templateIds.indexOf(tplId)
  if (idx >= 0) edit.templateIds.splice(idx, 1)
  else edit.templateIds.push(tplId)
}

async function saveSeries(code: string) {
  saving.value[code] = true
  try {
    const edit = getEdit(code)
    const res = await $fetch<{ ok: boolean; error?: string }>(`/api/admin/products/${code}`, {
      method: 'PUT',
      body: {
        introText: edit.introText,
        docIds: edit.docIds,
        templateIds: edit.templateIds,
        notes: edit.notes,
        priorityParams: edit.priorityParams
      }
    })
    if (!res.ok) throw new Error(res.error ?? 'Unbekannter Fehler')
    dbMeta.value[code] = { ...edit }
    toast.success(`${code} gespeichert`)
  } catch (e: any) {
    toast.error(`Fehler: ${e.message}`)
  }
  saving.value[code] = false
}

async function loadAttributes(code: string) {
  if (code in attrCache) return
  attrLoading[code] = true
  try {
    const res = await $fetch<{ ok: boolean; total: number; attributes: SeriesAttributes['attributes'] }>(
      `/api/admin/products/${code}/attributes`
    )
    attrCache[code] = res.ok ? { total: res.total, attributes: res.attributes } : null
  } catch {
    attrCache[code] = null
  } finally {
    attrLoading[code] = false
  }
}

function togglePriorityValue(code: string, field: keyof PriorityParams, value: string) {
  const params = getEdit(code).priorityParams
  const arr: string[] = [...(params[field] ?? [])]
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
  params[field] = arr.length ? arr : undefined
}

function isPrioritySelected(code: string, field: keyof PriorityParams, value: string): boolean {
  return (getEdit(code).priorityParams[field] ?? []).includes(value)
}

function hasAnyPriorityParam(code: string): boolean {
  const p = getEdit(code).priorityParams
  return Object.values(p).some(v => Array.isArray(v) && v.length > 0)
}

function fmtStat(s: NumericStats | null, unit = ''): string {
  if (!s) return '—'
  const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })
  return `${fmt(s.min)}–${fmt(s.max)} ${unit} · Ø ${fmt(s.avg)} · Median ${fmt(s.median)}`
}

// Dokumentsuche im Picker
const docSearch = ref<Record<string, string>>({})
function filteredDocs(code: string): DocOption[] {
  const q = (docSearch.value[code] ?? '').toLowerCase()
  if (!q) return docOptions.value.slice(0, 30)
  return docOptions.value.filter(d => d.name.toLowerCase().includes(q)).slice(0, 30)
}

// ── Katalog-Einträge (catalog_products CRUD) ─────────────────────────────────

interface KatalogEntry {
  id: string
  product_name: string
  category: string
  subcategory: string
  series: string | null
  description: string | null
  application: string | null
  features_certifications: string | null
  url: string | null
  image_path: string | null
  fan_technology: string | null
  fin_spacing: string | null
  defrost_type: string | null
  price: number | null
  is_active: boolean
  is_auto_generated: boolean
}

const katalogEntries   = ref<KatalogEntry[]>([])
const katalogTotal     = ref(0)
const katalogLoading   = ref(false)
const katalogSearch    = ref('')
const katalogCategory  = ref('')
const katalogOffset    = ref(0)
const KATALOG_LIMIT    = 50
const katalogExpanded  = reactive<Record<string, boolean>>({})
const katalogEditState = reactive<Record<string, Partial<KatalogEntry>>>({})
const katalogSaving    = reactive<Record<string, boolean>>({})

const KATALOG_CATEGORIES = [
  'Air Coolers', 'Condensers', 'Dry Coolers', 'CO₂ Gas Coolers', 'Liquid Coolers', 'OEM Heat Exchangers',
]

function getKatalogEdit(id: string): Partial<KatalogEntry> {
  if (!katalogEditState[id]) {
    const e = katalogEntries.value.find(x => x.id === id)
    if (e) katalogEditState[id] = { ...e }
  }
  return katalogEditState[id] ?? {}
}

function toggleKatalogExpand(id: string) {
  katalogExpanded[id] = !katalogExpanded[id]
  if (katalogExpanded[id]) getKatalogEdit(id)
}

async function loadKatalogEntries() {
  katalogLoading.value = true
  try {
    const params = new URLSearchParams({ limit: String(KATALOG_LIMIT), offset: String(katalogOffset.value) })
    if (katalogSearch.value)   params.set('search',   katalogSearch.value)
    if (katalogCategory.value) params.set('category', katalogCategory.value)
    const res = await $fetch<{ ok: boolean; entries: KatalogEntry[]; total: number }>(
      `/api/admin/products/catalog-entries?${params}`
    )
    if (res.ok) {
      katalogEntries.value = res.entries
      katalogTotal.value   = res.total
      catalogProductsTotal.value = res.total
    }
  } catch (e: any) { toast.error('Fehler Katalog-Einträge: ' + e.message) }
  katalogLoading.value = false
}

async function saveKatalogEntry(id: string) {
  katalogSaving[id] = true
  try {
    const edit = getKatalogEdit(id)
    const res = await $fetch<{ ok: boolean; entry?: KatalogEntry; error?: string }>(
      `/api/admin/products/catalog-entries/${id}`,
      { method: 'PUT', body: edit }
    )
    if (!res.ok) throw new Error(res.error ?? 'Unbekannter Fehler')
    const idx = katalogEntries.value.findIndex(x => x.id === id)
    if (idx >= 0 && res.entry) katalogEntries.value[idx] = res.entry
    katalogExpanded[id] = false
    delete katalogEditState[id]
    toast.success(`${edit.product_name} gespeichert`)
  } catch (e: any) { toast.error(`Fehler: ${e.message}`) }
  katalogSaving[id] = false
}

function cancelKatalogEdit(id: string) {
  katalogExpanded[id] = false
  delete katalogEditState[id]
}

let katalogSearchTimer: ReturnType<typeof setTimeout> | null = null
watch([katalogSearch, katalogCategory], () => {
  katalogOffset.value = 0
  if (katalogSearchTimer) clearTimeout(katalogSearchTimer)
  katalogSearchTimer = setTimeout(loadKatalogEntries, 300)
})

// ── Media Picker ──────────────────────────────────────────────────────────────

const mediaPicker = reactive({
  open: false, targetId: '', search: '', filter: 'eu' as 'eu' | 'all',
  images: [] as string[], loading: false, fallback: false,
})

const filteredMediaImages = computed(() => {
  const q = mediaPicker.search.toLowerCase()
  return q ? mediaPicker.images.filter(p => p.toLowerCase().includes(q)) : mediaPicker.images
})

async function loadMediaImages() {
  mediaPicker.loading = true
  try {
    const res = await $fetch<{ ok: boolean; images: string[]; fallback?: boolean }>(
      `/api/admin/products/images?filter=${mediaPicker.filter}`
    )
    if (res.ok) { mediaPicker.images = res.images; mediaPicker.fallback = res.fallback ?? false }
  } catch { }
  mediaPicker.loading = false
}

async function openMediaPicker(id: string) {
  mediaPicker.targetId = id; mediaPicker.search = ''; mediaPicker.open = true
  if (!mediaPicker.images.length) await loadMediaImages()
}

async function setMediaFilter(f: 'eu' | 'all') {
  mediaPicker.filter = f; mediaPicker.images = []
  await loadMediaImages()
}

function pickImage(path: string) {
  if (mediaPicker.targetId === '__new__') { createForm.image_path = path }
  else { const edit = getKatalogEdit(mediaPicker.targetId); edit.image_path = path }
  mediaPicker.open = false
}

// ── Create Product Modal ──────────────────────────────────────────────────────

const BLANK_CREATE_FORM = () => ({
  product_name: '', category: 'Air Coolers', subcategory: 'COMPACT',
  series: '', description: '', application: '', features_certifications: '',
  url: '', image_path: '', fan_technology: '', fin_spacing: '', defrost_type: '',
  price: 0, is_active: true,
})

const createModal  = ref(false)
const createSaving = ref(false)
const createError  = ref('')
const createForm   = reactive(BLANK_CREATE_FORM())

function openCreateModal() {
  Object.assign(createForm, BLANK_CREATE_FORM()); createError.value = ''; createModal.value = true
}

function closeCreateModal() { createModal.value = false }

async function saveNewProduct() {
  if (!createForm.product_name.trim()) { createError.value = 'Produktname ist erforderlich'; return }
  createSaving.value = true; createError.value = ''
  try {
    const res = await $fetch<{ ok: boolean; entry?: KatalogEntry; error?: string }>(
      '/api/admin/products/catalog-entries',
      { method: 'POST', body: { ...createForm } }
    )
    if (!res.ok) throw new Error(res.error ?? 'Fehler beim Speichern')
    if (res.entry) { katalogEntries.value.unshift(res.entry); katalogTotal.value++; catalogProductsTotal.value = (catalogProductsTotal.value ?? 0) + 1 }
    toast.success(`${createForm.product_name} angelegt`); closeCreateModal()
  } catch (e: any) { createError.value = e.message ?? 'Unbekannter Fehler' }
  createSaving.value = false
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Produkte & Ersatzteile"
      description="Produktkatalog, Ersatzteile und Serien-Metadaten an einem Ort verwalten."
    />

    <!-- Tab-Navigation -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'serien' }"
        @click="activeTab = 'serien'"
      >Serien</button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'produkte' }"
        @click="activeTab = 'produkte'"
      >Produktkatalog</button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'ersatzteile' }"
        @click="activeTab = 'ersatzteile'"
      >Ersatzteile</button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'katalog' }"
        @click="activeTab = 'katalog'"
      >Katalog</button>
    </div>

    <!-- ===================== TAB: SERIEN ===================== -->
    <div v-if="activeTab === 'serien'">

    <!-- Filter-Zeile -->
    <div class="filter-bar">
      <input
        v-model="searchText"
        type="search"
        placeholder="Serie suchen (z.B. GAMC)"
        class="filter-input"
      />
      <select v-model="filterCatId" class="filter-select">
        <option value="">Alle Kategorien</option>
        <option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
      <span class="filter-count">{{ filteredGroups.length }} Serien</span>
    </div>

    <div v-if="loading" class="loading-msg">Lade…</div>

    <ul v-else class="series-list">
      <li
        v-for="g in filteredGroups"
        :key="g.code"
        class="series-item"
        :class="{ 'series-item--enriched': isEnriched(g.code) }"
      >
        <!-- Header -->
        <button class="series-header" @click="toggleExpand(g.code)">
          <span class="series-header-left">
            <span class="series-code">{{ g.code }}</span>
            <span class="series-title">{{ g.displayTitle }}</span>
            <span v-for="catId in g.catIds" :key="catId" class="series-cat-badge">
              {{ catLabel(catId) }}
            </span>
          </span>
          <span class="series-header-right">
            <span v-if="isEnriched(g.code)" class="badge-enriched">gepflegt</span>
            <span v-else class="badge-empty">nicht gepflegt</span>
            <svg
              viewBox="0 0 16 16" width="14" height="14" fill="none"
              stroke="currentColor" stroke-width="1.5"
              :style="{ transform: expanded[g.code] ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }"
            >
              <path d="M3 6l5 5 5-5"/>
            </svg>
          </span>
        </button>

        <!-- Editor -->
        <div v-if="expanded[g.code]" class="series-editor">
          <!-- Chatbot-Intro -->
          <div class="field-group">
            <label class="field-label">Chatbot-Einleitung</label>
            <textarea
              v-model="getEdit(g.code).introText"
              class="field-textarea"
              placeholder="Günther zeigt diesen Text, wenn der User diese Serie in Unit Selection auswählt …"
              rows="4"
            />
          </div>

          <!-- Dokument-Picker -->
          <div class="field-group">
            <label class="field-label">Verknüpfte Dokumente</label>
            <div class="linked-chips">
              <span
                v-for="docId in getEdit(g.code).docIds"
                :key="docId"
                class="chip chip--doc"
              >
                📄 {{ docName(docId) }}
                <button class="chip-remove" @click="toggleDoc(g.code, docId)" aria-label="Entfernen">×</button>
              </span>
              <span v-if="!getEdit(g.code).docIds.length" class="no-links">Keine Dokumente verknüpft</span>
            </div>
            <input
              v-model="docSearch[g.code]"
              type="search"
              placeholder="Dokument suchen …"
              class="picker-search"
            />
            <div class="picker-list">
              <label
                v-for="doc in filteredDocs(g.code)"
                :key="doc.id"
                class="picker-row"
                :class="{ 'picker-row--selected': getEdit(g.code).docIds.includes(doc.id) }"
              >
                <input
                  type="checkbox"
                  :checked="getEdit(g.code).docIds.includes(doc.id)"
                  @change="toggleDoc(g.code, doc.id)"
                />
                <span class="picker-row-name">{{ doc.name }}</span>
                <span class="picker-row-meta">{{ doc.source === 'dms' ? 'DMS' : 'Upload' }} · {{ doc.type }}</span>
              </label>
              <p v-if="docOptions.length === 0" class="picker-empty">Keine Dokumente vorhanden. Bitte zuerst Dokumente hochladen oder aus dem DMS importieren.</p>
            </div>
          </div>

          <!-- Template-Picker -->
          <div class="field-group">
            <label class="field-label">Verknüpfte Templates</label>
            <div class="linked-chips">
              <span
                v-for="tplId in getEdit(g.code).templateIds"
                :key="tplId"
                class="chip chip--tpl"
              >
                ★ {{ tplName(tplId) }}
                <button class="chip-remove" @click="toggleTemplate(g.code, tplId)" aria-label="Entfernen">×</button>
              </span>
              <span v-if="!getEdit(g.code).templateIds.length" class="no-links">Keine Templates verknüpft</span>
            </div>
            <div class="picker-list picker-list--templates">
              <label
                v-for="tpl in tplOptions"
                :key="tpl.id"
                class="picker-row"
                :class="{ 'picker-row--selected': getEdit(g.code).templateIds.includes(tpl.id) }"
              >
                <input
                  type="checkbox"
                  :checked="getEdit(g.code).templateIds.includes(tpl.id)"
                  @change="toggleTemplate(g.code, tpl.id)"
                />
                <span class="picker-row-name">{{ tpl.name }}</span>
                <span class="picker-row-meta">{{ tpl.categorySlug }}</span>
              </label>
              <p v-if="tplOptions.length === 0" class="picker-empty">Keine Templates vorhanden.</p>
            </div>
          </div>

          <!-- Notizen -->
          <div class="field-group">
            <label class="field-label">Interne Notizen</label>
            <textarea
              v-model="getEdit(g.code).notes"
              class="field-textarea"
              placeholder="Interne Hinweise für das Admin-Team …"
              rows="2"
            />
          </div>

          <!-- Produktparameter -->
          <div class="field-group">
            <label class="field-label">Produktparameter &amp; Priorisierung</label>

            <div v-if="attrLoading[g.code]" class="attr-loading">Lade Produktdaten…</div>

            <div v-else-if="attrCache[g.code] === null" class="attr-empty">
              Keine Produkte für diese Serie in der Datenbank.
              Führe <code class="import-cmd-inline">node scripts/import-products.mjs</code> aus.
            </div>

            <div v-else-if="attrCache[g.code]" class="attr-section">
              <div class="attr-total">{{ attrCache[g.code]!.total.toLocaleString('de-DE') }} Produkte in der DB</div>

              <div class="attr-grid">
                <!-- Kältemittelgruppe -->
                <div class="attr-group" v-if="attrCache[g.code]!.attributes.series_variant.length > 1">
                  <div class="attr-group-label">Kältemittelgruppe</div>
                  <label
                    v-for="item in attrCache[g.code]!.attributes.series_variant"
                    :key="item.value"
                    class="attr-row"
                    :class="{ 'attr-row--selected': isPrioritySelected(g.code, 'series_variant', item.value) }"
                  >
                    <input
                      type="checkbox"
                      :checked="isPrioritySelected(g.code, 'series_variant', item.value)"
                      @change="togglePriorityValue(g.code, 'series_variant', item.value)"
                    />
                    <span class="attr-label">{{ item.value }}</span>
                    <span class="attr-count">{{ item.count.toLocaleString('de-DE') }}</span>
                  </label>
                </div>

                <!-- Abtauart -->
                <div class="attr-group" v-if="attrCache[g.code]!.attributes.defrost.length">
                  <div class="attr-group-label">Abtauart</div>
                  <label
                    v-for="item in attrCache[g.code]!.attributes.defrost"
                    :key="item.value"
                    class="attr-row"
                    :class="{ 'attr-row--selected': isPrioritySelected(g.code, 'defrost', item.value) }"
                  >
                    <input
                      type="checkbox"
                      :checked="isPrioritySelected(g.code, 'defrost', item.value)"
                      @change="togglePriorityValue(g.code, 'defrost', item.value)"
                    />
                    <span class="attr-label">{{ item.label }} ({{ item.value }})</span>
                    <span class="attr-count">{{ item.count.toLocaleString('de-DE') }}</span>
                  </label>
                </div>

                <!-- Fan-Technologie -->
                <div class="attr-group" v-if="attrCache[g.code]!.attributes.fan_technology.length">
                  <div class="attr-group-label">Fan-Technologie</div>
                  <label
                    v-for="item in attrCache[g.code]!.attributes.fan_technology"
                    :key="item.value"
                    class="attr-row"
                    :class="{ 'attr-row--selected': isPrioritySelected(g.code, 'fan_technology', item.value) }"
                  >
                    <input
                      type="checkbox"
                      :checked="isPrioritySelected(g.code, 'fan_technology', item.value)"
                      @change="togglePriorityValue(g.code, 'fan_technology', item.value)"
                    />
                    <span class="attr-label">{{ item.value }}</span>
                    <span class="attr-count">{{ item.count.toLocaleString('de-DE') }}</span>
                  </label>
                </div>

                <!-- Fin-Material -->
                <div class="attr-group" v-if="attrCache[g.code]!.attributes.fin_material.length">
                  <div class="attr-group-label">Fin-Material</div>
                  <label
                    v-for="item in attrCache[g.code]!.attributes.fin_material"
                    :key="item.value"
                    class="attr-row"
                    :class="{ 'attr-row--selected': isPrioritySelected(g.code, 'fin_material', item.value) }"
                  >
                    <input
                      type="checkbox"
                      :checked="isPrioritySelected(g.code, 'fin_material', item.value)"
                      @change="togglePriorityValue(g.code, 'fin_material', item.value)"
                    />
                    <span class="attr-label">{{ item.value }}</span>
                    <span class="attr-count">{{ item.count.toLocaleString('de-DE') }}</span>
                  </label>
                </div>
              </div>

              <!-- Numerische Übersicht -->
              <div class="attr-numeric">
                <div class="attr-numeric-row" v-if="attrCache[g.code]!.attributes.power_kw">
                  <span class="attr-numeric-label">Leistung (kW)</span>
                  <span class="attr-numeric-value">{{ fmtStat(attrCache[g.code]!.attributes.power_kw, 'kW') }}</span>
                </div>
                <div class="attr-numeric-row" v-if="attrCache[g.code]!.attributes.surface_m2">
                  <span class="attr-numeric-label">Fläche (m²)</span>
                  <span class="attr-numeric-value">{{ fmtStat(attrCache[g.code]!.attributes.surface_m2, 'm²') }}</span>
                </div>
                <div class="attr-numeric-row" v-if="attrCache[g.code]!.attributes.air_volume_m3h">
                  <span class="attr-numeric-label">Luftvolumen (m³/h)</span>
                  <span class="attr-numeric-value">{{ fmtStat(attrCache[g.code]!.attributes.air_volume_m3h, 'm³/h') }}</span>
                </div>
              </div>

              <!-- CTA -->
              <div class="attr-cta">
                <button
                  class="btn-suggest"
                  :disabled="!hasAnyPriorityParam(g.code)"
                  @click="() => {}"
                >
                  Template vorschlagen →
                </button>
                <span class="attr-cta-hint">
                  {{ hasAnyPriorityParam(g.code) ? 'Phase 2: wird nach dem Speichern aktiviert' : 'Zuerst Prioritäten auswählen und speichern' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Speichern -->
          <div class="editor-footer">
            <button
              class="btn-save"
              :disabled="saving[g.code]"
              @click="saveSeries(g.code)"
            >
              {{ saving[g.code] ? 'Speichern …' : 'Speichern' }}
            </button>
            <span v-if="getMeta(g.code).updatedAt" class="updated-at">
              Zuletzt: {{ new Date(getMeta(g.code).updatedAt!).toLocaleDateString('de-DE') }}
            </span>
          </div>
        </div>
      </li>
    </ul>
    </div><!-- /tab serien -->

    <!-- ===================== TAB: PRODUKTKATALOG ===================== -->
    <div v-if="activeTab === 'produkte'">
      <div class="tab-hint" v-if="catalogTotal === 0 && !catalogLoading">
        <p>Noch keine Produkte importiert. Führe folgenden Befehl aus:</p>
        <code class="import-cmd">node scripts/import-products.mjs</code>
        <p class="tab-hint-sub">Danach stehen alle CSV-Produkte hier zur Verfügung.</p>
      </div>

      <div v-else>
        <!-- Filter -->
        <div class="filter-bar">
          <input v-model="catalogSearch" type="search" placeholder="Suche (Typ, Code …)" class="filter-input" />
          <select v-model="catalogSeries" class="filter-select">
            <option value="">Alle Serien</option>
            <option v-for="g in allGroups" :key="g.code" :value="g.code">{{ g.code }} – {{ g.displayTitle }}</option>
          </select>
          <span class="filter-count">{{ catalogTotal.toLocaleString('de-DE') }} Produkte</span>
        </div>

        <div v-if="catalogLoading" class="loading-msg">Lade…</div>

        <!-- Tabelle -->
        <div v-else class="catalog-table-wrap">
          <table class="catalog-table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Serie</th>
                <th>Preis</th>
                <th>Abt.</th>
                <th>Fläche</th>
                <th>Luftvol.</th>
                <th>L×B×H (mm)</th>
                <th>Gewicht</th>
                <th>Datei</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in catalogProducts" :key="p.product_code">
                <td class="td-type">
                  <span class="type-name">{{ p.type_name }}</span>
                  <span class="type-code">{{ p.product_code }}</span>
                </td>
                <td><span class="series-code-sm">{{ p.series_variant }}</span></td>
                <td class="td-num">{{ fmtPrice(p.price) }}</td>
                <td class="td-center">{{ p.defrost ?? '—' }}</td>
                <td class="td-num">{{ fmtNum(p.surface_m2, 'm²') }}</td>
                <td class="td-num">{{ fmtNum(p.air_volume_m3h, 'm³/h') }}</td>
                <td class="td-num">{{ p.unit_length_mm ? `${p.unit_length_mm}×${p.unit_width_mm}×${p.unit_height_mm}` : '—' }}</td>
                <td class="td-num">{{ fmtNum(p.weight_kg, 'kg') }}</td>
                <td class="td-file">{{ p.source_file ?? '—' }}</td>
              </tr>
              <tr v-if="!catalogProducts.length">
                <td colspan="9" class="td-empty">Keine Produkte gefunden</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="catalogTotal > CATALOG_LIMIT" class="pagination">
          <button class="pg-btn" :disabled="catalogOffset === 0" @click="catalogOffset -= CATALOG_LIMIT; loadCatalog()">‹ Zurück</button>
          <span class="pg-info">{{ catalogOffset + 1 }}–{{ Math.min(catalogOffset + CATALOG_LIMIT, catalogTotal) }} / {{ catalogTotal }}</span>
          <button class="pg-btn" :disabled="catalogOffset + CATALOG_LIMIT >= catalogTotal" @click="catalogOffset += CATALOG_LIMIT; loadCatalog()">Weiter ›</button>
        </div>
      </div>
    </div><!-- /tab produkte -->

    <!-- ===================== TAB: ERSATZTEILE ===================== -->
    <div v-if="activeTab === 'ersatzteile'">
      <div class="tab-hint" v-if="spareTotal === 0 && !spareLoading">
        <p>Noch keine Ersatzteile importiert. Führe folgende Befehle aus:</p>
        <code class="import-cmd">node scripts/import-spare-parts.mjs --list-sheets</code>
        <code class="import-cmd">node scripts/import-spare-parts.mjs</code>
        <p class="tab-hint-sub">Tipp: Starte mit <strong>--list-sheets</strong> um die Sheet-Struktur zu prüfen, dann importieren.</p>
      </div>

      <div v-else>
        <!-- Filter -->
        <div class="filter-bar">
          <input v-model="spareSearch" type="search" placeholder="Code oder Beschreibung …" class="filter-input" />
          <select v-model="spareCategory" class="filter-select">
            <option value="">Alle Kategorien</option>
            <option value="Fans">Fans</option>
            <option value="Heating elements">Heating elements</option>
            <option value="Other">Other</option>
          </select>
          <span class="filter-count">{{ spareTotal.toLocaleString('de-DE') }} Ersatzteile</span>
        </div>

        <div v-if="spareLoading" class="loading-msg">Lade…</div>

        <div v-else class="catalog-table-wrap">
          <table class="catalog-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Beschreibung</th>
                <th>Kategorie</th>
                <th>Preis</th>
                <th>Verfügbar</th>
                <th>Serien</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in spareParts" :key="p.id">
                <td><span class="type-code">{{ p.code }}</span></td>
                <td>{{ p.description || '—' }}</td>
                <td>{{ p.category || '—' }}</td>
                <td class="td-num">{{ fmtPrice(p.price) }}</td>
                <td>
                  <span class="avail-badge" :class="`avail-${p.availability}`">{{ p.availability }}</span>
                </td>
                <td>
                  <span v-if="p.series_codes?.length" class="series-chips">
                    <span v-for="s in p.series_codes" :key="s" class="series-code-sm">{{ s }}</span>
                  </span>
                  <span v-else class="td-empty-cell">—</span>
                </td>
                <td class="td-file">{{ p.source }}</td>
              </tr>
              <tr v-if="!spareParts.length">
                <td colspan="7" class="td-empty">Keine Ersatzteile gefunden</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="spareTotal > SPARE_LIMIT" class="pagination">
          <button class="pg-btn" :disabled="spareOffset === 0" @click="spareOffset -= SPARE_LIMIT; loadSpareParts()">‹ Zurück</button>
          <span class="pg-info">{{ spareOffset + 1 }}–{{ Math.min(spareOffset + SPARE_LIMIT, spareTotal) }} / {{ spareTotal }}</span>
          <button class="pg-btn" :disabled="spareOffset + SPARE_LIMIT >= spareTotal" @click="spareOffset += SPARE_LIMIT; loadSpareParts()">Weiter ›</button>
        </div>
      </div>
    </div><!-- /tab ersatzteile -->

    <!-- ===================== TAB: KATALOG ===================== -->
    <div v-if="activeTab === 'katalog'" class="katalog-tab">

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-number">{{ catalogProductsTotal ?? '…' }}</span>
          <span class="stat-label">Katalog-Produkte</span>
        </div>
      </div>

      <!-- Sync card -->
      <div class="sync-card">
        <h3 class="sync-title">Produktbilder synchronisieren</h3>
        <p class="sync-desc">
          Scannt <code>/public/images/products/</code> nach EU-Hero-Bildern und legt fehlende
          Einträge automatisch in <code>catalog_products</code> an.
          Funktioniert nur im lokalen Dev-Modus (kein Vercel-Serverless).
        </p>
        <label class="dry-run-label">
          <input type="checkbox" v-model="syncDryRun" />
          Nur Vorschau (kein Einfügen)
        </label>
        <button class="btn btn-primary sync-btn" :disabled="syncLoading" @click="runSync()">
          <span v-if="syncLoading">Synchronisiere…</span>
          <span v-else>Produktbilder synchronisieren</span>
        </button>
        <p v-if="syncError" class="sync-error">{{ syncError }}</p>
        <div v-if="syncResult" class="sync-result">
          <p class="sync-summary">
            <template v-if="syncResult.dryRun">
              Vorschau: <strong>{{ syncResult.preview }}</strong> würden angelegt,
              <strong>{{ syncResult.skipped }}</strong> bereits vorhanden ({{ syncResult.total }} EU-Bilder)
            </template>
            <template v-else>
              <strong>{{ syncResult.created }}</strong> neue Produkte angelegt,
              <strong>{{ syncResult.skipped }}</strong> bereits vorhanden ({{ syncResult.total }} EU-Bilder)
            </template>
          </p>
          <ul v-if="syncResult.products.length" class="sync-product-list">
            <li v-for="p in syncResult.products" :key="p.id">
              <span class="sync-product-name">{{ p.product_name }}</span>
              <span class="sync-product-meta">{{ p.category }} · {{ p.subcategory }}</span>
            </li>
          </ul>
          <p v-else class="sync-none">Alle EU-Bilder sind bereits im Katalog vorhanden.</p>
        </div>
      </div>

      <!-- Catalog entries table -->
      <div class="ke-section">
        <div class="ke-header">
          <div class="ke-header-left">
            <h3 class="ke-title">Katalog-Produkte</h3>
            <span class="ke-total">{{ katalogTotal }} Einträge</span>
          </div>
          <div class="ke-header-right">
            <input v-model="katalogSearch" type="search" placeholder="Name, Serie …" class="ke-search" />
            <select v-model="katalogCategory" class="ke-cat-select">
              <option value="">Alle Kategorien</option>
              <option v-for="c in KATALOG_CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
            <button class="ke-create-btn" @click="openCreateModal">
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>
              Neues Produkt
            </button>
          </div>
        </div>

        <div v-if="katalogLoading" class="ke-loading">Lade…</div>
        <div v-else class="ke-table-wrap">
          <table class="ke-table">
            <thead>
              <tr>
                <th class="ke-th ke-th-img"></th>
                <th class="ke-th">Name</th>
                <th class="ke-th">Kategorie</th>
                <th class="ke-th">Linie</th>
                <th class="ke-th">Fan</th>
                <th class="ke-th">Abtauung</th>
                <th class="ke-th ke-th-center">Aktiv</th>
                <th class="ke-th ke-th-auto"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="e in katalogEntries" :key="e.id">
                <tr class="ke-row" :class="{ 'ke-row--expanded': katalogExpanded[e.id] }">
                  <td class="ke-td ke-td-img">
                    <img :src="e.image_path ?? '/images/products/Floor Air Cooler EU.png'" class="ke-thumb" loading="lazy" :alt="e.product_name" />
                  </td>
                  <td class="ke-td">
                    <div class="ke-name">{{ e.product_name }}</div>
                    <div v-if="e.series" class="ke-series">{{ e.series }}</div>
                  </td>
                  <td class="ke-td"><span class="ke-badge ke-badge--cat">{{ e.category }}</span></td>
                  <td class="ke-td"><span class="ke-badge ke-badge--sub">{{ e.subcategory }}</span></td>
                  <td class="ke-td ke-td-mono">{{ e.fan_technology ?? '—' }}</td>
                  <td class="ke-td ke-td-mono">{{ e.defrost_type ?? '—' }}</td>
                  <td class="ke-td ke-td-center">
                    <span class="ke-active-dot" :class="e.is_active ? 'ke-active-dot--on' : 'ke-active-dot--off'"></span>
                  </td>
                  <td class="ke-td ke-td-action">
                    <button class="ke-expand-btn" @click="toggleKatalogExpand(e.id)">{{ katalogExpanded[e.id] ? '▲' : '▼' }}</button>
                  </td>
                </tr>
                <tr v-if="katalogExpanded[e.id]" class="ke-edit-row">
                  <td colspan="8" class="ke-edit-cell">
                    <div class="ke-edit-form">
                      <div class="ke-fields-grid">
                        <div class="ke-field">
                          <label class="ke-label">Produktname</label>
                          <input v-model="getKatalogEdit(e.id).product_name" class="ke-input" type="text" />
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Kategorie</label>
                          <select v-model="getKatalogEdit(e.id).category" class="ke-select">
                            <option v-for="c in KATALOG_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                          </select>
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Linie</label>
                          <select v-model="getKatalogEdit(e.id).subcategory" class="ke-select">
                            <option value="COMPACT">COMPACT</option>
                            <option value="VARIO">VARIO</option>
                            <option value="Application Specific">Application Specific</option>
                          </select>
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Serie</label>
                          <input v-model="getKatalogEdit(e.id).series" class="ke-input" type="text" />
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Ventilatortechnik</label>
                          <select v-model="getKatalogEdit(e.id).fan_technology" class="ke-select">
                            <option value="">—</option><option value="EC">EC</option><option value="AC">AC</option>
                          </select>
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Abtauung</label>
                          <select v-model="getKatalogEdit(e.id).defrost_type" class="ke-select">
                            <option value="">—</option><option value="Luft">Luft</option><option value="Elektrisch">Elektrisch</option><option value="Heißgas">Heißgas</option>
                          </select>
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Lamellenabstand</label>
                          <input v-model="getKatalogEdit(e.id).fin_spacing" class="ke-input" type="text" placeholder="z.B. 4mm" />
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Preis (€)</label>
                          <input v-model.number="getKatalogEdit(e.id).price" class="ke-input" type="number" step="0.01" min="0" />
                        </div>
                      </div>
                      <div class="ke-field ke-field--full">
                        <label class="ke-label">Beschreibung</label>
                        <textarea v-model="getKatalogEdit(e.id).description" class="ke-textarea" rows="2" />
                      </div>
                      <div class="ke-fields-grid ke-fields-grid--2">
                        <div class="ke-field">
                          <label class="ke-label">Anwendung</label>
                          <input v-model="getKatalogEdit(e.id).application" class="ke-input" type="text" />
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">Zertifikate</label>
                          <input v-model="getKatalogEdit(e.id).features_certifications" class="ke-input" type="text" />
                        </div>
                        <div class="ke-field">
                          <label class="ke-label">URL</label>
                          <input v-model="getKatalogEdit(e.id).url" class="ke-input" type="url" />
                        </div>
                      </div>
                      <!-- Image picker -->
                      <div class="ke-field ke-field--full">
                        <label class="ke-label">Bild (IMAGE_PATH)</label>
                        <div v-if="getKatalogEdit(e.id).image_path" class="ip-preview">
                          <div class="ip-thumb-wrap">
                            <img :src="getKatalogEdit(e.id).image_path!" class="ip-thumb" :alt="e.product_name" />
                            <button class="ip-remove-btn" title="Bild entfernen" @click="getKatalogEdit(e.id).image_path = null">
                              <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>
                            </button>
                          </div>
                          <div class="ip-info">
                            <span class="ip-path">{{ getKatalogEdit(e.id).image_path }}</span>
                            <button class="ip-change-btn" @click="openMediaPicker(e.id)">Anderes Bild wählen</button>
                          </div>
                        </div>
                        <div v-else class="ip-dropzone" @click="openMediaPicker(e.id)">
                          <svg viewBox="0 0 40 40" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35" aria-hidden="true"><rect x="4" y="4" width="32" height="32" rx="4"/><circle cx="14" cy="15" r="3"/><path d="M4 28l8-8 6 6 5-5 9 7"/></svg>
                          <div class="ip-dropzone-text">
                            <span>Kein Bild zugewiesen</span>
                            <span class="ip-dropzone-hint">Klicken zum Auswählen aus <code>/images/products/</code></span>
                          </div>
                        </div>
                      </div>
                      <div class="ke-active-toggle">
                        <label class="ke-check-label">
                          <input type="checkbox" v-model="getKatalogEdit(e.id).is_active" />
                          Im Frontend sichtbar (is_active)
                        </label>
                        <span v-if="e.is_auto_generated" class="ke-auto-badge">Auto-generiert</span>
                      </div>
                      <div class="ke-edit-footer">
                        <button class="ke-cancel-btn" @click="cancelKatalogEdit(e.id)">Abbrechen</button>
                        <button class="btn btn-primary" :disabled="katalogSaving[e.id]" @click="saveKatalogEntry(e.id)">
                          {{ katalogSaving[e.id] ? 'Speichern …' : 'Speichern' }}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!katalogEntries.length">
                <td colspan="8" class="ke-empty">Keine Katalog-Produkte gefunden</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="katalogTotal > KATALOG_LIMIT" class="ke-pagination">
          <button class="pg-btn" :disabled="katalogOffset === 0" @click="katalogOffset -= KATALOG_LIMIT; loadKatalogEntries()">‹ Zurück</button>
          <span class="pg-info">{{ katalogOffset + 1 }}–{{ Math.min(katalogOffset + KATALOG_LIMIT, katalogTotal) }} / {{ katalogTotal }}</span>
          <button class="pg-btn" :disabled="katalogOffset + KATALOG_LIMIT >= katalogTotal" @click="katalogOffset += KATALOG_LIMIT; loadKatalogEntries()">Weiter ›</button>
        </div>
      </div>

    </div><!-- /tab katalog -->

  </div>

  <!-- Media Picker Modal -->
  <Teleport to="body">
    <div v-if="mediaPicker.open" class="mp-overlay" @click.self="mediaPicker.open = false">
      <div class="mp-modal" role="dialog" aria-modal="true">
        <div class="mp-header">
          <div class="mp-header-left">
            <h3 class="mp-title">Bild auswählen</h3>
            <span v-if="mediaPicker.fallback" class="mp-fallback-note">Statische Liste (Dev-Modus für vollständige Auswahl)</span>
          </div>
          <div class="mp-header-right">
            <div class="mp-filter-tabs">
              <button class="mp-filter-btn" :class="{ 'mp-filter-btn--active': mediaPicker.filter === 'eu' }" @click="setMediaFilter('eu')">Hero-Bilder (EU)</button>
              <button class="mp-filter-btn" :class="{ 'mp-filter-btn--active': mediaPicker.filter === 'all' }" @click="setMediaFilter('all')">Alle Bilder</button>
            </div>
            <input v-model="mediaPicker.search" type="search" class="mp-search" placeholder="Suchen (z.B. Flat, Condenser) …" />
            <button class="mp-close-btn" @click="mediaPicker.open = false">
              <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
            </button>
          </div>
        </div>
        <div class="mp-body">
          <div v-if="mediaPicker.loading" class="mp-loading">Lade Bilder…</div>
          <div v-else-if="!filteredMediaImages.length" class="mp-empty">Keine Bilder gefunden für „{{ mediaPicker.search }}"</div>
          <div v-else class="mp-grid">
            <button
              v-for="path in filteredMediaImages" :key="path"
              class="mp-card"
              :class="{ 'mp-card--selected': (mediaPicker.targetId === '__new__' ? createForm.image_path : getKatalogEdit(mediaPicker.targetId).image_path) === path }"
              @click="pickImage(path)"
            >
              <div class="mp-card-img-wrap"><img :src="path" class="mp-card-img" loading="lazy" /></div>
              <span class="mp-card-name">{{ path.split('/').pop()?.replace(' EU.png','').replace('.png','') }}</span>
              <div v-if="(mediaPicker.targetId === '__new__' ? createForm.image_path : getKatalogEdit(mediaPicker.targetId).image_path) === path" class="mp-card-check">✓</div>
            </button>
          </div>
        </div>
        <div class="mp-footer">
          <span class="mp-count">{{ filteredMediaImages.length }} Bild{{ filteredMediaImages.length !== 1 ? 'er' : '' }}</span>
          <button class="ke-cancel-btn" @click="mediaPicker.open = false">Abbrechen</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Create Product Modal -->
  <Teleport to="body">
    <div v-if="createModal" class="mp-overlay" @click.self="closeCreateModal">
      <div class="mp-modal cm-modal" role="dialog" aria-modal="true">
        <div class="mp-header">
          <h3 class="mp-title">Neues Produkt anlegen</h3>
          <button class="mp-close-btn" @click="closeCreateModal">
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
          </button>
        </div>
        <div class="mp-body cm-body">
          <div class="ke-fields-grid">
            <div class="ke-field">
              <label class="ke-label">Produktname <span class="cm-req">*</span></label>
              <input v-model="createForm.product_name" class="ke-input" type="text" placeholder="z.B. Cubic COMPACT Air Cooler" />
            </div>
            <div class="ke-field">
              <label class="ke-label">Kategorie <span class="cm-req">*</span></label>
              <select v-model="createForm.category" class="ke-select">
                <option v-for="c in KATALOG_CATEGORIES" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="ke-field">
              <label class="ke-label">Linie <span class="cm-req">*</span></label>
              <select v-model="createForm.subcategory" class="ke-select">
                <option value="COMPACT">COMPACT</option>
                <option value="VARIO">VARIO</option>
                <option value="Application Specific">Application Specific</option>
              </select>
            </div>
            <div class="ke-field">
              <label class="ke-label">Serie</label>
              <input v-model="createForm.series" class="ke-input" type="text" />
            </div>
            <div class="ke-field">
              <label class="ke-label">Ventilatortechnik</label>
              <select v-model="createForm.fan_technology" class="ke-select">
                <option value="">—</option><option value="EC">EC</option><option value="AC">AC</option>
              </select>
            </div>
            <div class="ke-field">
              <label class="ke-label">Abtauung</label>
              <select v-model="createForm.defrost_type" class="ke-select">
                <option value="">—</option><option value="Luft">Luft</option><option value="Elektrisch">Elektrisch</option><option value="Heißgas">Heißgas</option>
              </select>
            </div>
            <div class="ke-field">
              <label class="ke-label">Lamellenabstand</label>
              <input v-model="createForm.fin_spacing" class="ke-input" type="text" placeholder="z.B. 4mm" />
            </div>
            <div class="ke-field">
              <label class="ke-label">Preis (€)</label>
              <input v-model.number="createForm.price" class="ke-input" type="number" step="0.01" min="0" />
            </div>
          </div>
          <div class="ke-field ke-field--full">
            <label class="ke-label">Beschreibung</label>
            <textarea v-model="createForm.description" class="ke-textarea" rows="2" placeholder="Kurze Produktbeschreibung …" />
          </div>
          <div class="ke-fields-grid ke-fields-grid--2">
            <div class="ke-field">
              <label class="ke-label">Anwendung</label>
              <input v-model="createForm.application" class="ke-input" type="text" />
            </div>
            <div class="ke-field">
              <label class="ke-label">Zertifikate</label>
              <input v-model="createForm.features_certifications" class="ke-input" type="text" placeholder="NSF, UL …" />
            </div>
            <div class="ke-field">
              <label class="ke-label">URL</label>
              <input v-model="createForm.url" class="ke-input" type="url" placeholder="https://…" />
            </div>
          </div>
          <!-- Image picker for create form -->
          <div class="ke-field ke-field--full">
            <label class="ke-label">Bild (IMAGE_PATH)</label>
            <div v-if="createForm.image_path" class="ip-preview">
              <div class="ip-thumb-wrap">
                <img :src="createForm.image_path" class="ip-thumb" alt="Produktbild" />
                <button class="ip-remove-btn" title="Bild entfernen" @click="createForm.image_path = ''">
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>
                </button>
              </div>
              <div class="ip-info">
                <span class="ip-path">{{ createForm.image_path }}</span>
                <button class="ip-change-btn" @click="openMediaPicker('__new__')">Anderes Bild wählen</button>
              </div>
            </div>
            <div v-else class="ip-dropzone" @click="openMediaPicker('__new__')">
              <svg viewBox="0 0 40 40" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35" aria-hidden="true"><rect x="4" y="4" width="32" height="32" rx="4"/><circle cx="14" cy="15" r="3"/><path d="M4 28l8-8 6 6 5-5 9 7"/></svg>
              <div class="ip-dropzone-text">
                <span>Kein Bild zugewiesen</span>
                <span class="ip-dropzone-hint">Klicken zum Auswählen</span>
              </div>
            </div>
          </div>
          <div class="ke-active-toggle">
            <label class="ke-check-label"><input type="checkbox" v-model="createForm.is_active" /> Im Frontend sichtbar</label>
          </div>
          <p v-if="createError" class="cm-error">{{ createError }}</p>
        </div>
        <div class="mp-footer">
          <button class="ke-cancel-btn" @click="closeCreateModal">Abbrechen</button>
          <button class="btn btn-primary" :disabled="createSaving" @click="saveNewProduct">
            {{ createSaving ? 'Anlegen …' : 'Produkt anlegen' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}
.filter-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  background: white;
}
.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  background: white;
}
.filter-count {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  white-space: nowrap;
}
.loading-msg {
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  padding: var(--space-5);
  text-align: center;
}
.series-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.series-item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: white;
}
.series-item--enriched {
  border-left: 3px solid var(--c-brand-blue);
}
.series-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 12px;
}
.series-header:hover {
  background: var(--c-surface-subtle, #f9f9fb);
}
.series-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.series-code {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}
.series-title {
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  font-weight: 500;
}
.series-cat-badge {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  background: var(--c-surface-subtle, #f4f4f6);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
}
.series-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.badge-enriched {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: #1a8057;
  background: #e6f4ee;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}
.badge-empty {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  background: var(--c-surface-subtle, #f4f4f6);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}
.series-editor {
  border-top: 1px solid var(--c-border);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  color: var(--c-text-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  resize: vertical;
  line-height: 1.5;
}
.field-textarea:focus {
  outline: none;
  border-color: var(--c-brand-blue);
}
.linked-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
  align-items: center;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 10px;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.chip--doc { background: #e8f0fe; color: #1a56db; }
.chip--tpl { background: #fef3e2; color: #b45309; }
.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.6;
  font-size: 14px;
  line-height: 1;
}
.chip-remove:hover { opacity: 1; }
.no-links {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  font-style: italic;
}
.picker-search {
  padding: 7px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  width: 100%;
  max-width: 360px;
}
.picker-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: #fafafa;
}
.picker-list--templates {
  max-height: 160px;
}
.picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.picker-row:hover { background: color-mix(in srgb, var(--c-brand-blue) 5%, white); }
.picker-row--selected { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); }
.picker-row-name {
  flex: 1;
  color: var(--c-text-value);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picker-row-meta {
  color: var(--c-text-medium);
  flex-shrink: 0;
}
.picker-empty {
  padding: 12px;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  margin: 0;
}
.editor-footer {
  display: flex;
  align-items: center;
  gap: 16px;
}
.btn-save {
  padding: 8px 20px;
  background: var(--c-brand-blue);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-save:hover:not(:disabled) { opacity: 0.88; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.updated-at {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}

/* ---- Tabs ---- */
.tab-nav {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--c-border);
  margin-bottom: var(--space-5);
}
.tab-btn {
  padding: 10px 22px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-medium);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn:hover { color: var(--c-brand-blue); }
.tab-btn--active {
  color: var(--c-brand-blue);
  border-bottom-color: var(--c-brand-blue);
}

/* ---- Import-Hint ---- */
.tab-hint {
  padding: var(--space-5) var(--space-4);
  background: #fafafa;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-medium);
}
.import-cmd {
  display: block;
  margin: var(--space-2) 0;
  padding: 8px 12px;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
}
.tab-hint-sub {
  margin-top: var(--space-3);
  font-size: var(--font-3xs);
}

/* ---- Katalog-Tabelle ---- */
.catalog-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
}
.catalog-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.catalog-table thead tr {
  background: var(--c-surface-subtle, #f4f4f6);
}
.catalog-table th {
  padding: 9px 12px;
  text-align: left;
  font-weight: 500;
  color: var(--c-text-medium);
  white-space: nowrap;
  border-bottom: 1px solid var(--c-border);
}
.catalog-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--c-border-card, #ebebee);
  color: var(--c-text-value);
  vertical-align: top;
}
.catalog-table tbody tr:hover { background: var(--c-surface-subtle, #f9f9fb); }
.td-type { max-width: 280px; }
.type-name {
  display: block;
  font-weight: 500;
  color: var(--c-text-value);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.type-code {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-text-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.series-code-sm {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  white-space: nowrap;
}
.td-num { text-align: right; font-family: var(--font-mono); font-size: 11px; white-space: nowrap; }
.td-center { text-align: center; }
.td-file { font-size: 11px; color: var(--c-text-medium); font-family: var(--font-mono); }
.td-empty { text-align: center; color: var(--c-text-medium); padding: 24px; }
.td-empty-cell { color: var(--c-text-medium); }
.series-chips { display: flex; gap: 4px; flex-wrap: wrap; }

.avail-badge {
  display: inline-block;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  white-space: nowrap;
}
.avail-in-stock { background: #e6f4ee; color: #1a8057; }
.avail-out-of-stock { background: #fef3cd; color: #92400e; }
.avail-not-available { background: #fde8e8; color: #c81e1e; }

/* ---- Produktparameter-Sektion ---- */
.attr-loading {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  padding: 8px 0;
  font-style: italic;
}
.attr-empty {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  padding: 10px 12px;
  background: #fafafa;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-sm);
}
.import-cmd-inline {
  font-family: var(--font-mono);
  font-size: var(--font-3xs);
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
}
.attr-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 12px;
  background: var(--c-surface-subtle, #f9f9fb);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
.attr-total {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.attr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}
.attr-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.attr-group-label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 600;
  color: var(--c-text-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.attr-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  transition: background 0.1s;
}
.attr-row:hover { background: white; }
.attr-row--selected { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); }
.attr-label {
  flex: 1;
  color: var(--c-text-value);
}
.attr-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-text-medium);
  white-space: nowrap;
}
.attr-numeric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--c-border);
}
.attr-numeric-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.attr-numeric-label {
  font-weight: 500;
  color: var(--c-text-medium);
  min-width: 120px;
  flex-shrink: 0;
}
.attr-numeric-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-text-value);
}
.attr-cta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: var(--space-2);
  border-top: 1px solid var(--c-border);
}
.btn-suggest {
  padding: 6px 16px;
  background: white;
  border: 1px solid var(--c-brand-blue);
  color: var(--c-brand-blue);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-suggest:hover:not(:disabled) {
  background: var(--c-brand-blue);
  color: white;
}
.btn-suggest:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.attr-cta-hint {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  font-style: italic;
}

/* ---- Pagination ---- */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: var(--space-4) 0;
}
.pg-btn {
  padding: 6px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  cursor: pointer;
}
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-btn:not(:disabled):hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }
.pg-info {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}

/* ── Stats / Sync ─────────────────────────────────────────────────────────── */
.stats-row { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; }
.stat-card { padding: 14px 20px; background: white; border: 1px solid var(--c-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
.stat-number { font-family: var(--font-mono); font-size: 28px; font-weight: 700; color: var(--c-brand-blue, #003865); line-height: 1; }
.stat-label { font-family: var(--font-ui); font-size: var(--font-3xs); color: var(--c-text-medium); }
.sync-card { padding: 20px; background: white; border: 1px solid var(--c-border); border-radius: var(--radius-md); margin-bottom: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.sync-title { font-family: var(--font-ui); font-size: var(--font-sm); font-weight: 600; color: var(--c-text-dark); margin: 0; }
.sync-desc { font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-medium); margin: 0; line-height: 1.5; }
.sync-desc code { background: var(--c-bg-light); padding: 1px 5px; border-radius: 3px; font-family: var(--font-mono); font-size: var(--font-3xs); }
.dry-run-label { display: flex; align-items: center; gap: 8px; font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-dark); cursor: pointer; }
.sync-btn { align-self: flex-start; }
.sync-error { color: #c00; font-family: var(--font-ui); font-size: var(--font-sm); margin: 0; }
.sync-result { padding: 14px; background: #f9f9fb; border: 1px solid var(--c-border); border-radius: var(--radius-sm); }
.sync-summary { font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-dark); margin: 0 0 10px; }
.sync-product-list { margin: 0; padding: 0 0 0 16px; display: flex; flex-direction: column; gap: 4px; }
.sync-product-list li { font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-dark); display: flex; align-items: baseline; gap: 10px; }
.sync-product-name { font-weight: 500; }
.sync-product-meta { font-family: var(--font-mono); font-size: var(--font-3xs); color: var(--c-text-medium); }
.sync-none { font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-medium); margin: 0; font-style: italic; }

/* ── Katalog-Einträge ────────────────────────────────────────────────────────── */
.ke-section { margin-top: var(--space-5); border: 1px solid var(--c-border); border-radius: var(--radius-md); background: white; overflow: hidden; }
.ke-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 12px 16px; border-bottom: 1px solid var(--c-border); flex-wrap: wrap; background: var(--c-surface-subtle, #f9f9fb); }
.ke-header-left { display: flex; align-items: center; gap: var(--space-3); }
.ke-title { font-family: var(--font-ui); font-size: var(--font-sm); font-weight: 600; color: var(--c-text-dark); margin: 0; }
.ke-total { font-family: var(--font-ui); font-size: var(--font-3xs); color: var(--c-text-medium); background: var(--c-bg-light); border: 1px solid var(--c-border); border-radius: 20px; padding: 2px 10px; }
.ke-header-right { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.ke-search { padding: 6px 10px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: var(--font-xs); width: 200px; background: white; }
.ke-cat-select { padding: 6px 10px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: var(--font-xs); background: white; }
.ke-create-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--c-brand-blue, #003865); color: white; border: none; border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: var(--font-xs); font-weight: 600; cursor: pointer; white-space: nowrap; transition: opacity 0.12s; }
.ke-create-btn:hover { opacity: 0.88; }
.ke-loading { padding: var(--space-5); text-align: center; color: var(--c-text-medium); font-family: var(--font-ui); font-size: var(--font-xs); }
.ke-table-wrap { overflow-x: auto; }
.ke-table { width: 100%; border-collapse: collapse; }
.ke-th { padding: 8px 12px; font-family: var(--font-ui); font-size: var(--font-3xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-text-medium); text-align: left; border-bottom: 1px solid var(--c-border); background: var(--c-surface-subtle, #f9f9fb); white-space: nowrap; }
.ke-th-img { width: 52px; }
.ke-th-center { text-align: center; }
.ke-th-auto { width: 48px; }
.ke-td { padding: 8px 12px; font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-dark); border-bottom: 1px solid var(--c-border-light, #eee); vertical-align: middle; }
.ke-td-img { width: 52px; padding: 4px 8px; }
.ke-td-mono { font-family: var(--font-mono); font-size: var(--font-3xs); color: var(--c-text-medium); }
.ke-td-center { text-align: center; }
.ke-td-action { width: 48px; text-align: center; }
.ke-row:hover { background: #f5f5f7; }
.ke-row--expanded { background: #f0f4ff; }
.ke-thumb { width: 40px; height: 32px; object-fit: contain; border-radius: 4px; background: #f5f5f5; display: block; }
.ke-name { font-weight: 500; }
.ke-series { font-family: var(--font-mono); font-size: var(--font-3xs); color: var(--c-text-medium); }
.ke-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: var(--font-ui); }
.ke-badge--cat { background: #e8f0fe; color: #174ea6; }
.ke-badge--sub { background: #e6f4ea; color: #1e7e34; }
.ke-active-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.ke-active-dot--on { background: #2e7d32; }
.ke-active-dot--off { background: #bbb; }
.ke-expand-btn { border: none; background: transparent; cursor: pointer; color: var(--c-text-medium); font-size: 11px; padding: 4px 8px; border-radius: 4px; transition: background 0.1s; }
.ke-expand-btn:hover { background: var(--c-border); }
.ke-edit-row { background: #f0f4ff; }
.ke-edit-cell { padding: 0; }
.ke-edit-form { padding: 16px; display: flex; flex-direction: column; gap: 12px; border-top: 2px solid var(--c-brand-blue, #003865); }
.ke-fields-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.ke-fields-grid--2 { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.ke-field { display: flex; flex-direction: column; gap: 4px; }
.ke-field--full { grid-column: 1 / -1; }
.ke-label { font-family: var(--font-ui); font-size: var(--font-3xs); font-weight: 600; color: var(--c-text-medium); text-transform: uppercase; letter-spacing: 0.05em; }
.ke-input, .ke-select { padding: 6px 10px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: var(--font-xs); background: white; width: 100%; box-sizing: border-box; }
.ke-input:focus, .ke-select:focus { outline: none; border-color: var(--c-brand-blue, #003865); }
.ke-textarea { padding: 6px 10px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: var(--font-xs); background: white; width: 100%; box-sizing: border-box; resize: vertical; }
.ke-textarea:focus { outline: none; border-color: var(--c-brand-blue, #003865); }
.ke-active-toggle { display: flex; align-items: center; gap: var(--space-4); }
.ke-check-label { display: flex; align-items: center; gap: var(--space-2); font-family: var(--font-ui); font-size: var(--font-sm); color: var(--c-text-dark); cursor: pointer; }
.ke-auto-badge { font-family: var(--font-ui); font-size: var(--font-3xs); color: #7a5800; background: #fff8e1; border: 1px solid #ffe082; border-radius: 20px; padding: 2px 10px; font-weight: 500; }
.ke-edit-footer { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-2); padding-top: 8px; border-top: 1px solid #eee; }
.ke-cancel-btn { padding: 6px 16px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); background: white; font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-medium); cursor: pointer; }
.ke-cancel-btn:hover { background: #f5f5f7; }
.ke-empty { text-align: center; padding: var(--space-5); color: var(--c-text-medium); font-family: var(--font-ui); font-size: var(--font-xs); }
.ke-pagination { display: flex; align-items: center; justify-content: center; gap: var(--space-3); padding: 12px; border-top: 1px solid var(--c-border); }

/* ── Inline Image Picker ──────────────────────────────────────────────────── */
.ip-preview { display: flex; align-items: center; gap: 14px; padding: 10px; border: 1px solid var(--c-border); border-radius: var(--radius-md); background: #f9f9fb; }
.ip-thumb-wrap { position: relative; flex-shrink: 0; width: 100px; height: 72px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); overflow: hidden; background: white; display: flex; align-items: center; justify-content: center; }
.ip-thumb { max-width: 100%; max-height: 100%; object-fit: contain; }
.ip-remove-btn { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: white; cursor: pointer; transition: background 0.12s; }
.ip-remove-btn:hover { background: #c00; }
.ip-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ip-path { font-family: var(--font-mono); font-size: var(--font-3xs); color: var(--c-text-medium); word-break: break-all; }
.ip-change-btn { align-self: flex-start; padding: 5px 12px; border: 1px solid var(--c-brand-blue, #003865); border-radius: var(--radius-sm); background: white; font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-brand-blue, #003865); cursor: pointer; transition: all 0.12s; }
.ip-change-btn:hover { background: var(--c-brand-blue, #003865); color: white; }
.ip-dropzone { display: flex; align-items: center; gap: 14px; padding: 16px; border: 2px dashed var(--c-border); border-radius: var(--radius-md); background: #f9f9fb; cursor: pointer; transition: all 0.14s; }
.ip-dropzone:hover { border-color: var(--c-brand-blue, #003865); background: #f0f4ff; }
.ip-dropzone-text { display: flex; flex-direction: column; gap: 3px; font-family: var(--font-ui); }
.ip-dropzone-text span:first-child { font-size: var(--font-sm); font-weight: 500; color: var(--c-text-dark); }
.ip-dropzone-hint { font-size: var(--font-xs); color: var(--c-text-medium); }
.ip-dropzone-hint code { background: var(--c-bg-light); padding: 1px 5px; border-radius: 3px; }

/* ── Media Picker Modal ───────────────────────────────────────────────────── */
.mp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.mp-modal { background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); width: 100%; max-width: 860px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
.cm-modal { max-width: 700px; }
.mp-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--c-border); flex-wrap: wrap; background: #f9f9fb; }
.mp-header-left { display: flex; align-items: center; gap: 10px; }
.mp-title { font-family: var(--font-ui); font-size: 15px; font-weight: 600; color: var(--c-text-dark); margin: 0; }
.mp-fallback-note { font-family: var(--font-ui); font-size: var(--font-3xs); color: #7a5800; background: #fff8e1; border: 1px solid #ffe082; border-radius: 20px; padding: 2px 10px; }
.mp-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mp-filter-tabs { display: flex; gap: 2px; background: var(--c-bg-light); border: 1px solid var(--c-border); border-radius: var(--radius-sm); padding: 2px; }
.mp-filter-btn { padding: 4px 12px; border: none; border-radius: 4px; background: transparent; font-family: var(--font-ui); font-size: var(--font-3xs); font-weight: 500; color: var(--c-text-medium); cursor: pointer; white-space: nowrap; transition: all 0.1s; }
.mp-filter-btn--active { background: white; color: var(--c-brand-blue, #003865); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.mp-search { padding: 6px 12px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: var(--font-xs); width: 200px; background: white; }
.mp-search:focus { outline: none; border-color: var(--c-brand-blue, #003865); }
.mp-close-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-border); border-radius: var(--radius-sm); background: white; cursor: pointer; color: var(--c-text-medium); transition: all 0.1s; }
.mp-close-btn:hover { background: #fff0f0; border-color: #f66; color: #c00; }
.mp-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.cm-body { display: flex; flex-direction: column; gap: 12px; }
.mp-loading, .mp-empty { text-align: center; padding: 40px; color: var(--c-text-medium); font-family: var(--font-ui); font-size: var(--font-xs); }
.mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
.mp-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px; border: 2px solid var(--c-border); border-radius: var(--radius-md); background: white; cursor: pointer; transition: all 0.12s; position: relative; text-align: center; }
.mp-card:hover { border-color: var(--c-brand-blue, #003865); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.mp-card--selected { border-color: var(--c-brand-blue, #003865); background: #f0f4ff; }
.mp-card-img-wrap { width: 100%; height: 80px; display: flex; align-items: center; justify-content: center; background: #f9f9fb; border-radius: 4px; overflow: hidden; }
.mp-card-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.mp-card-name { font-family: var(--font-ui); font-size: 10px; color: var(--c-text-medium); line-height: 1.3; word-break: break-word; }
.mp-card--selected .mp-card-name { color: var(--c-brand-blue, #003865); font-weight: 600; }
.mp-card-check { position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; background: var(--c-brand-blue, #003865); color: white; border-radius: 50%; font-size: 10px; font-weight: 700; }
.mp-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid var(--c-border); background: #f9f9fb; }
.mp-count { font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-medium); }
.cm-req { color: #c00; }
.cm-error { color: #c00; font-family: var(--font-ui); font-size: var(--font-sm); margin: 0; padding: 8px 12px; background: #fff0f0; border: 1px solid #fcc; border-radius: var(--radius-sm); }
</style>
