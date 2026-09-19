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
const activeTab = ref<'serien' | 'produkte' | 'ersatzteile'>('serien')

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
})

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

  </div>
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
</style>
