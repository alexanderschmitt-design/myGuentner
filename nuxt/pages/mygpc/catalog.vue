<script setup lang="ts">
import { getCatalogProductImagePath } from '~/utils/productImagePath'

useHead({ title: 'myGPC — Catalog' })

const route  = useRoute()
const router = useRouter()

const { openProductInChat } = useProductChatTrigger()

// ── Types ────────────────────────────────────────────────────────────────────

interface CatalogProduct {
  id: string
  category: string
  subcategory: string
  product_name: string
  type: string | null
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
}

interface CategoryCount { category: string; count: number }

// ── Static definitions ────────────────────────────────────────────────────────

const CATEGORY_DEFS = [
  { id: 'Air Coolers',        name: 'Air Coolers' },
  { id: 'Condensers',         name: 'Condensers' },
  { id: 'Dry Coolers',        name: 'Dry Coolers' },
  { id: 'CO₂ Gas Coolers',    name: 'CO₂ Gas Coolers' },
  { id: 'Liquid Coolers',     name: 'Liquid Coolers' },
  { id: 'OEM Heat Exchangers',name: 'OEM Heat Exchangers' },
]
const SUBCATEGORIES = ['COMPACT', 'VARIO', 'Application Specific']
const APP_OPTIONS   = ['Commercial', 'Industrial', 'HVAC', 'Food Processing', 'Agriculture', 'Data Centers']
const FAN_OPTIONS   = ['EC', 'AC']
const DEFROST_OPTIONS = ['Luft', 'Elektrisch', 'Heißgas']

// ── Filter state (URL-synced) ─────────────────────────────────────────────────

const selectedCategory    = ref((route.query.category    as string) || '')
const selectedSubcategory = ref((route.query.subcategory as string) || '')
const selectedApp         = ref((route.query.app         as string) || '')
const selectedFans        = ref<string[]>(
  route.query.fans ? String(route.query.fans).split(',').filter(Boolean) : []
)
const selectedDefrosts    = ref<string[]>(
  route.query.defrosts ? String(route.query.defrosts).split(',').filter(Boolean) : []
)
const search              = ref((route.query.search as string) || '')
const viewMode            = ref<'grid' | 'list'>('grid')
const page                = ref(parseInt((route.query.page as string) || '1', 10))
const LIMIT               = 100

// Dropdown open state
const openDd   = ref('')

// ── API: category counts ──────────────────────────────────────────────────────

const { data: countsData } = await useFetch<{ ok: boolean; counts: CategoryCount[] }>(
  '/api/products/catalog-counts'
)
const countMap = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const c of countsData.value?.counts ?? []) m[c.category] = c.count
  return m
})

// ── API: products ─────────────────────────────────────────────────────────────

const apiQuery = computed(() => {
  const q: Record<string, string | number> = {
    limit:  LIMIT,
    offset: (page.value - 1) * LIMIT,
  }
  if (selectedCategory.value)       q.category       = selectedCategory.value
  if (selectedSubcategory.value)    q.subcategory    = selectedSubcategory.value
  if (selectedApp.value)            q.application    = selectedApp.value
  if (search.value)                 q.search         = search.value
  if (selectedFans.value.length)    q.fan_technology = selectedFans.value.join(',')
  if (selectedDefrosts.value.length) q.defrost_type  = selectedDefrosts.value.join(',')
  return q
})

const { data, pending } = await useFetch<{ ok: boolean; products: CatalogProduct[]; total: number }>(
  '/api/products/catalog-products',
  { query: apiQuery, watch: [apiQuery] }
)

const products   = computed(() => data.value?.products ?? [])
const totalCount = computed(() => data.value?.total    ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / LIMIT)))

// ── URL sync ──────────────────────────────────────────────────────────────────

function pushQuery() {
  const q: Record<string, string> = {}
  if (selectedCategory.value)       q.category  = selectedCategory.value
  if (selectedSubcategory.value)    q.subcategory = selectedSubcategory.value
  if (selectedApp.value)            q.app        = selectedApp.value
  if (search.value)                 q.search     = search.value
  if (selectedFans.value.length)    q.fans       = selectedFans.value.join(',')
  if (selectedDefrosts.value.length) q.defrosts  = selectedDefrosts.value.join(',')
  if (page.value > 1)               q.page       = String(page.value)
  router.push({ query: q })
}

// ── Filter actions ────────────────────────────────────────────────────────────

function setCategory(c: string) {
  selectedCategory.value    = c
  selectedSubcategory.value = ''
  page.value = 1
  openDd.value = ''
  pushQuery()
}

function setSubcategory(s: string) {
  selectedSubcategory.value = selectedSubcategory.value === s ? '' : s
  page.value = 1; openDd.value = ''; pushQuery()
}

function setApp(a: string) {
  selectedApp.value = selectedApp.value === a ? '' : a
  page.value = 1; openDd.value = ''; pushQuery()
}

function toggleFan(f: string) {
  const idx = selectedFans.value.indexOf(f)
  if (idx >= 0) selectedFans.value.splice(idx, 1)
  else selectedFans.value.push(f)
  page.value = 1; pushQuery()
}

function toggleDefrost(d: string) {
  const idx = selectedDefrosts.value.indexOf(d)
  if (idx >= 0) selectedDefrosts.value.splice(idx, 1)
  else selectedDefrosts.value.push(d)
  page.value = 1; pushQuery()
}

function clearAll() {
  selectedCategory.value    = ''
  selectedSubcategory.value = ''
  selectedApp.value         = ''
  selectedFans.value        = []
  selectedDefrosts.value    = []
  search.value              = ''
  page.value = 1; pushQuery()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  page.value = 1
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(pushQuery, 350)
}

function goPage(n: number) {
  if (n < 1 || n > totalPages.value) return
  page.value = n; pushQuery()
}

// ── Dropdown helpers ──────────────────────────────────────────────────────────

function toggleDd(name: string) {
  openDd.value = openDd.value === name ? '' : name
}

function closeDd() { openDd.value = '' }

onMounted(() => document.addEventListener('click', closeDd))
onBeforeUnmount(() => document.removeEventListener('click', closeDd))

// ── Computed labels ───────────────────────────────────────────────────────────

const lineLabel = computed(() => selectedSubcategory.value || 'Alle Linien')
const appLabel  = computed(() => selectedApp.value || 'Alle Bereiche')

const fanLabel = computed(() => {
  if (!selectedFans.value.length) return 'Alle'
  if (selectedFans.value.length === 1) return selectedFans.value[0]
  return selectedFans.value.join(' & ') + ' Ventilatoren'
})

const defrostLabel = computed(() => {
  if (!selectedDefrosts.value.length) return 'Alle'
  return selectedDefrosts.value.join(', ')
})

const hasActiveSubFilters = computed(() =>
  !!selectedSubcategory.value || !!selectedApp.value ||
  !!selectedFans.value.length || !!selectedDefrosts.value.length
)

const hasActiveFilters = computed(() =>
  !!selectedCategory.value || hasActiveSubFilters.value || !!search.value
)

// ── Card helpers ──────────────────────────────────────────────────────────────

function certBadges(p: CatalogProduct): string[] {
  if (!p.features_certifications) return []
  return p.features_certifications.split(',').map(s => s.trim()).filter(Boolean)
}

function appBadge(p: CatalogProduct): string {
  if (!p.application) return ''
  return p.application.split('/')[0].trim()
}
</script>

<template>
  <div class="catalog-page" @click="closeDd">

    <!-- ── Filter bar ─────────────────────────────────────────────────────── -->
    <div class="cfb" @click.stop>
      <div class="catalog-inner">

      <!-- Row 1: Categories + Search + View Toggle -->
      <div class="cfb-row1">
        <span class="cfb-label">Kategorie:</span>

        <div class="cfb-cats">
          <button
            class="cfb-cat"
            :class="{ active: !selectedCategory }"
            @click="setCategory('')"
          >Alle</button>
          <button
            v-for="def in CATEGORY_DEFS"
            :key="def.id"
            class="cfb-cat"
            :class="{ active: selectedCategory === def.id }"
            @click="setCategory(def.id)"
          >
            {{ def.name }}
            <span v-if="countMap[def.id]" class="cfb-cat-count">{{ countMap[def.id] }}</span>
          </button>
        </div>

        <div class="cfb-right">
          <label class="cfb-search">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="9" cy="9" r="6"/>
              <line x1="13.5" y1="13.5" x2="17" y2="17" stroke-linecap="round"/>
            </svg>
            <input
              v-model="search"
              type="search"
              placeholder="Schnellsuche (z.B. Agri, Blast, EC)…"
              @input="onSearchInput"
            />
          </label>

          <div class="cfb-view-toggle">
            <button
              class="cfb-view-btn"
              :class="{ active: viewMode === 'grid' }"
              :aria-pressed="viewMode === 'grid'"
              title="Kachelansicht"
              @click="viewMode = 'grid'"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
                <rect x="1" y="1" width="6" height="6" rx="1"/>
                <rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/>
                <rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button
              class="cfb-view-btn"
              :class="{ active: viewMode === 'list' }"
              :aria-pressed="viewMode === 'list'"
              title="Listenansicht"
              @click="viewMode = 'list'"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <line x1="4" y1="4" x2="15" y2="4"/>
                <circle cx="1.5" cy="4" r="1" fill="currentColor" stroke="none"/>
                <line x1="4" y1="8" x2="15" y2="8"/>
                <circle cx="1.5" cy="8" r="1" fill="currentColor" stroke="none"/>
                <line x1="4" y1="12" x2="15" y2="12"/>
                <circle cx="1.5" cy="12" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: Subfilter dropdowns -->
      <div class="cfb-row2">

        <!-- Linie dropdown -->
        <div class="cfb-dd" @click.stop>
          <button
            class="cfb-dd-trigger"
            :class="{ active: !!selectedSubcategory, open: openDd === 'linie' }"
            @click="toggleDd('linie')"
          >
            <span class="cfb-dd-prefix">Linie:</span>
            <span class="cfb-dd-val">{{ lineLabel }}</span>
            <svg class="cfb-dd-arrow" viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>
          <div v-show="openDd === 'linie'" class="cfb-dd-panel">
            <button
              class="cfb-dd-opt"
              :class="{ active: !selectedSubcategory }"
              @click="setSubcategory('')"
            >Alle Linien</button>
            <button
              v-for="s in SUBCATEGORIES"
              :key="s"
              class="cfb-dd-opt"
              :class="{ active: selectedSubcategory === s }"
              @click="setSubcategory(s)"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Anwendung dropdown -->
        <div class="cfb-dd" @click.stop>
          <button
            class="cfb-dd-trigger"
            :class="{ active: !!selectedApp, open: openDd === 'app' }"
            @click="toggleDd('app')"
          >
            <span class="cfb-dd-prefix">Anwendung:</span>
            <span class="cfb-dd-val">{{ appLabel }}</span>
            <svg class="cfb-dd-arrow" viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>
          <div v-show="openDd === 'app'" class="cfb-dd-panel">
            <button
              class="cfb-dd-opt"
              :class="{ active: !selectedApp }"
              @click="setApp('')"
            >Alle Bereiche</button>
            <button
              v-for="a in APP_OPTIONS"
              :key="a"
              class="cfb-dd-opt"
              :class="{ active: selectedApp === a }"
              @click="setApp(a)"
            >{{ a }}</button>
          </div>
        </div>

        <!-- Technik dropdown (multi-select) -->
        <div class="cfb-dd" @click.stop>
          <button
            class="cfb-dd-trigger"
            :class="{ active: selectedFans.length > 0, open: openDd === 'fans' }"
            @click="toggleDd('fans')"
          >
            <span class="cfb-dd-prefix">Technik:</span>
            <span class="cfb-dd-val">{{ fanLabel }}</span>
            <span v-if="selectedFans.length" class="cfb-dd-badge">{{ selectedFans.length }}</span>
            <svg class="cfb-dd-arrow" viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>
          <div v-show="openDd === 'fans'" class="cfb-dd-panel">
            <label
              v-for="f in FAN_OPTIONS"
              :key="f"
              class="cfb-dd-opt cfb-dd-opt--check"
              :class="{ active: selectedFans.includes(f) }"
            >
              <input type="checkbox" :value="f" :checked="selectedFans.includes(f)" @change="toggleFan(f)" />
              {{ f }} Ventilatoren
            </label>
          </div>
        </div>

        <!-- Abtauung dropdown (multi-select) -->
        <div class="cfb-dd" @click.stop>
          <button
            class="cfb-dd-trigger"
            :class="{ active: selectedDefrosts.length > 0, open: openDd === 'defrost' }"
            @click="toggleDd('defrost')"
          >
            <span class="cfb-dd-prefix">Abtauung:</span>
            <span class="cfb-dd-val">{{ defrostLabel }}</span>
            <span v-if="selectedDefrosts.length" class="cfb-dd-badge">{{ selectedDefrosts.length }}</span>
            <svg class="cfb-dd-arrow" viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>
          <div v-show="openDd === 'defrost'" class="cfb-dd-panel">
            <label
              v-for="d in DEFROST_OPTIONS"
              :key="d"
              class="cfb-dd-opt cfb-dd-opt--check"
              :class="{ active: selectedDefrosts.includes(d) }"
            >
              <input type="checkbox" :value="d" :checked="selectedDefrosts.includes(d)" @change="toggleDefrost(d)" />
              {{ d }}
            </label>
          </div>
        </div>

        <!-- Reset -->
        <button
          v-if="hasActiveSubFilters"
          class="cfb-reset"
          @click="clearAll"
        >
          <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
            <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
          Filter zurücksetzen
        </button>

      </div>

      <!-- Row 3: Summary -->
      <div class="cfb-summary">
        <span class="cfb-dot" aria-hidden="true"></span>
        <template v-if="pending">Suche…</template>
        <template v-else>
          Zeige <strong>{{ totalCount.toLocaleString('de-DE') }}</strong> Modelle
          <template v-if="selectedCategory"> in <strong>{{ selectedCategory }}</strong></template>
        </template>
      </div>

      </div><!-- /catalog-inner -->
    </div><!-- /cfb -->

    <!-- ── Product body ───────────────────────────────────────────────────── -->
    <div class="catalog-body">
      <div class="catalog-inner">

        <!-- Loading -->
        <div v-if="pending" class="catalog-loading">
          <div v-for="i in 6" :key="i" class="catalog-skeleton" />
        </div>

        <!-- Empty -->
        <div v-else-if="products.length === 0" class="catalog-empty">
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3" aria-hidden="true">
            <rect x="8" y="8" width="32" height="32" rx="4"/>
            <line x1="16" y1="24" x2="32" y2="24"/>
            <line x1="24" y1="16" x2="24" y2="32"/>
          </svg>
          <p>Keine Produkte für diese Filter gefunden.</p>
          <button class="btn btn-outline" @click="clearAll">Filter zurücksetzen</button>
        </div>

        <!-- Grid view -->
        <div v-else-if="viewMode === 'grid'" class="catalog-grid">
          <div
            v-for="p in products"
            :key="p.id"
            class="catalog-card catalog-card--clickable"
            role="button"
            tabindex="0"
            :aria-label="`${p.product_name} – Mit Günther besprechen`"
            @click="openProductInChat({ productName: p.product_name, category: p.category, subcategory: p.subcategory, series: p.series, description: p.description, imagePath: getCatalogProductImagePath(p) })"
            @keydown.enter="openProductInChat({ productName: p.product_name, category: p.category, subcategory: p.subcategory, series: p.series, description: p.description, imagePath: getCatalogProductImagePath(p) })"
          >
            <div class="catalog-card-img-wrap">
              <img
                :src="getCatalogProductImagePath(p)"
                :alt="p.product_name"
                class="catalog-card-img"
                loading="lazy"
              />
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-meta">
                <span class="catalog-tag catalog-tag--sub">{{ p.subcategory }}</span>
                <span class="catalog-tag catalog-tag--cat">{{ p.category }}</span>
              </div>
              <h3 class="catalog-card-title">{{ p.product_name }}</h3>
              <p v-if="p.description" class="catalog-card-desc">{{ p.description }}</p>

              <div v-if="p.application" class="catalog-card-badges">
                <span class="catalog-badge catalog-badge--app">
                  <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <circle cx="6" cy="6" r="5"/>
                  </svg>
                  {{ appBadge(p) }}
                </span>
              </div>

              <div v-if="certBadges(p).length" class="catalog-card-certs">
                <span
                  v-for="cert in certBadges(p)"
                  :key="cert"
                  class="catalog-badge catalog-badge--cert"
                >{{ cert }}</span>
              </div>

              <div class="catalog-card-footer">
                <button
                  type="button"
                  class="catalog-chat-btn"
                  @click.stop="openProductInChat({ productName: p.product_name, category: p.category, subcategory: p.subcategory, series: p.series, description: p.description, imagePath: getCatalogProductImagePath(p) })"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2 3.5a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 2v-2H3a1 1 0 01-1-1v-7z"/>
                  </svg>
                  Mit Günther besprechen
                </button>
                <a
                  v-if="p.url"
                  :href="p.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="catalog-link-btn"
                  :aria-label="`Produktseite ${p.product_name}`"
                  @click.stop
                >
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                    <path d="M7 2h3v3"/><path d="M10 2L5 7"/><path d="M5 3H2v7h7V7"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- List view -->
        <div v-else class="catalog-list-wrap">
          <table class="catalog-table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th>Kategorie</th>
                <th>Linie</th>
                <th>Anwendung</th>
                <th>Zertifikate</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in products"
                :key="p.id"
                class="catalog-row catalog-row--clickable"
                @click="openProductInChat({ productName: p.product_name, category: p.category, subcategory: p.subcategory, series: p.series, description: p.description, imagePath: getCatalogProductImagePath(p) })"
              >
                <td class="catalog-row-name">
                  <div class="catalog-row-img-wrap">
                    <img
                      :src="getCatalogProductImagePath(p)"
                      :alt="p.product_name"
                      class="catalog-row-img"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div class="catalog-row-title">{{ p.product_name }}</div>
                    <div v-if="p.description" class="catalog-row-desc">{{ p.description }}</div>
                  </div>
                </td>
                <td><span class="catalog-tag catalog-tag--cat">{{ p.category }}</span></td>
                <td><span class="catalog-tag catalog-tag--sub">{{ p.subcategory }}</span></td>
                <td class="catalog-row-app">{{ p.application ?? '—' }}</td>
                <td>
                  <div class="catalog-cert-list">
                    <span v-for="cert in certBadges(p)" :key="cert" class="catalog-badge catalog-badge--cert">{{ cert }}</span>
                  </div>
                </td>
                <td @click.stop>
                  <a
                    v-if="p.url"
                    :href="p.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="catalog-ext-link"
                    :aria-label="`Produktseite ${p.product_name}`"
                  >
                    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                      <path d="M8 2h4v4"/><path d="M12 2L6 8"/><path d="M6 3H2v9h9V9"/>
                    </svg>
                  </a>
                  <span v-else class="catalog-row-na">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <nav v-if="totalPages > 1" class="catalog-pagination" aria-label="Seiten">
          <button class="page-btn" :disabled="page <= 1" @click="goPage(page - 1)">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 12L6 8l4-4"/></svg>
          </button>
          <template v-for="n in totalPages" :key="n">
            <button
              v-if="n === 1 || n === totalPages || Math.abs(n - page) <= 2"
              class="page-btn"
              :class="{ active: n === page }"
              @click="goPage(n)"
            >{{ n }}</button>
            <span v-else-if="n === 2 && page > 4" class="page-ellipsis">…</span>
            <span v-else-if="n === totalPages - 1 && page < totalPages - 3" class="page-ellipsis">…</span>
          </template>
          <button class="page-btn" :disabled="page >= totalPages" @click="goPage(page + 1)">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 4l4 4-4 4"/></svg>
          </button>
        </nav>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Page shell ────────────────────────────────────────────────────────────── */
.catalog-page {
  /* Break out of site-main's 24px top + 32px side padding so the filter bar
     reaches the full viewport width, matching the header. */
  margin: -24px -32px 0;
  min-height: 100vh;
  background: var(--c-bg);
}
.catalog-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER BAR
══════════════════════════════════════════════════════════════════════════════ */
.cfb {
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* ── Row 1: categories ────────────────────────────────────────────────────── */
.cfb-row1 {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 10px;
  border-bottom: 1px solid var(--c-border);
  min-width: 0;
}

.cfb-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-text-light);
  white-space: nowrap;
  flex-shrink: 0;
}

.cfb-cats {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
  scrollbar-width: none;
}
.cfb-cats::-webkit-scrollbar { display: none; }

.cfb-cat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid var(--c-border);
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--c-text-medium);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s;
  flex-shrink: 0;
}
.cfb-cat:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.cfb-cat.active {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
  font-weight: 600;
}
.cfb-cat-count {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.85;
  background: rgba(255,255,255,0.25);
  border-radius: 10px;
  padding: 0 5px;
  min-width: 18px;
  text-align: center;
  line-height: 1.6;
}
.cfb-cat:not(.active) .cfb-cat-count {
  background: var(--c-bg);
  color: var(--c-text-light);
  opacity: 1;
}

.cfb-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cfb-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  background: var(--c-bg);
  color: var(--c-text-light);
  cursor: text;
  width: 220px;
  transition: border-color 0.12s;
}
.cfb-search:focus-within { border-color: var(--c-primary); }
.cfb-search input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--c-text);
  outline: none;
  min-width: 0;
}
.cfb-search input::placeholder { color: var(--c-text-light); }

.cfb-view-toggle {
  display: flex;
  gap: 1px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 2px;
}
.cfb-view-btn {
  width: 28px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--c-text-light);
  transition: all 0.12s;
}
.cfb-view-btn.active {
  background: var(--c-surface);
  color: var(--c-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* ── Row 2: subfilter dropdowns ───────────────────────────────────────────── */
.cfb-row2 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--c-border);
}

.cfb-dd {
  position: relative;
}

.cfb-dd-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  background: var(--c-surface);
  font-family: inherit;
  font-size: 12.5px;
  color: var(--c-text-medium);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s;
}
.cfb-dd-trigger:hover,
.cfb-dd-trigger.open {
  border-color: var(--c-primary);
  color: var(--c-text);
}
.cfb-dd-trigger.active {
  border-color: var(--c-primary);
  background: rgba(38, 102, 224, 0.06);
  color: var(--c-primary);
}

.cfb-dd-prefix {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-text-light);
}
.cfb-dd-trigger.active .cfb-dd-prefix { color: var(--c-primary); opacity: 0.8; }

.cfb-dd-val { font-weight: 500; }

.cfb-dd-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.cfb-dd-arrow {
  color: var(--c-text-light);
  flex-shrink: 0;
  transition: transform 0.15s;
}
.cfb-dd-trigger.open .cfb-dd-arrow { transform: rotate(180deg); }

.cfb-dd-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 180px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 200;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cfb-dd-opt {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 5px;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  text-align: left;
  color: var(--c-text-medium);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.cfb-dd-opt:hover { background: var(--c-bg); color: var(--c-text); }
.cfb-dd-opt.active {
  background: rgba(38, 102, 224, 0.08);
  color: var(--c-primary);
  font-weight: 600;
}

.cfb-dd-opt--check {
  cursor: pointer;
}
.cfb-dd-opt--check input[type="checkbox"] {
  width: 14px; height: 14px;
  accent-color: var(--c-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.cfb-reset {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 4px 8px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 12px;
  color: var(--c-text-light);
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
  transition: color 0.12s;
}
.cfb-reset:hover { color: var(--c-danger, #c00); }

/* ── Row 3: summary ───────────────────────────────────────────────────────── */
.cfb-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 0;
  font-size: 12.5px;
  color: var(--c-text-light);
}
.cfb-summary strong { color: var(--c-text); font-weight: 600; }

.cfb-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #4caf50;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT BODY
══════════════════════════════════════════════════════════════════════════════ */
.catalog-body { padding: 24px 0 48px; }

/* ── Loading ─────────────────────────────────────────────────────────────── */
.catalog-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.catalog-skeleton {
  height: 340px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--c-bg) 25%, var(--c-surface-alt, #f0f0f3) 50%, var(--c-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty ───────────────────────────────────────────────────────────────── */
.catalog-empty {
  text-align: center;
  padding: 64px 0;
  color: var(--c-text-light);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.catalog-empty p { font-size: 14px; }

/* ── Grid cards ──────────────────────────────────────────────────────────── */
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.catalog-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s, transform 0.12s, border-color 0.15s;
}
.catalog-card--clickable {
  cursor: pointer;
}
.catalog-card--clickable:hover {
  box-shadow: 0 6px 20px rgba(38, 102, 224, 0.12);
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--c-primary, #2666e0) 40%, transparent);
}
.catalog-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,0.09);
  transform: translateY(-1px);
}
.catalog-card-img-wrap {
  height: 180px;
  background: var(--c-bg);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.catalog-card-img {
  width: 100%; height: 100%;
  object-fit: contain;
  padding: 12px;
}
.catalog-card-body {
  padding: 14px;
  flex: 1;
  display: flex; flex-direction: column; gap: 6px;
}
.catalog-card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.catalog-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text);
  margin: 0;
  line-height: 1.35;
}
.catalog-card-desc {
  font-size: 12px;
  color: var(--c-text-medium);
  line-height: 1.5;
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.catalog-card-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
.catalog-card-certs  { display: flex; gap: 4px; flex-wrap: wrap; }
.catalog-card-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.catalog-chat-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-ui, sans-serif);
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary, #2666e0);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: opacity 0.12s;
}
.catalog-chat-btn:hover { opacity: 0.75; }

/* Shared tags/badges */
.catalog-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  padding: 2px 6px;
}
.catalog-tag--sub { color: var(--c-primary); background: rgba(38, 102, 224, 0.08); }
.catalog-tag--cat { color: var(--c-text-light); background: var(--c-surface-alt, #f0f0f3); }

.catalog-badge {
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  padding: 2px 7px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.catalog-badge--app  { background: rgba(38, 143, 243, 0.1); color: #268ff3; }
.catalog-badge--cert { background: rgba(91, 140, 90, 0.1); color: #5b8c5a; font-weight: 600; }

.catalog-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-primary);
  text-decoration: none;
  transition: opacity 0.12s;
}
.catalog-link-btn:hover { opacity: 0.75; }

/* ── List view ───────────────────────────────────────────────────────────── */
.catalog-list-wrap { overflow-x: auto; }
.catalog-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.catalog-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid var(--c-border);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--c-text-light);
  white-space: nowrap;
}
.catalog-row td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-border);
  vertical-align: middle;
}
.catalog-row--clickable { cursor: pointer; }
.catalog-row--clickable:hover td {
  background: color-mix(in srgb, var(--c-primary, #2666e0) 5%, var(--c-bg));
}
.catalog-row:hover td { background: var(--c-bg); }

.catalog-row-name {
  display: flex !important;
  align-items: flex-start;
  gap: 10px;
  max-width: 340px;
}
.catalog-row-img-wrap {
  width: 48px; height: 48px;
  background: var(--c-bg);
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.catalog-row-img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
.catalog-row-title { font-weight: 600; color: var(--c-text); font-size: 13px; }
.catalog-row-desc {
  font-size: 11px;
  color: var(--c-text-light);
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.catalog-row-app { font-size: 12px; color: var(--c-text-medium); max-width: 160px; }
.catalog-cert-list { display: flex; gap: 4px; flex-wrap: wrap; }
.catalog-ext-link {
  color: var(--c-primary);
  display: flex; align-items: center;
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.12s;
}
.catalog-ext-link:hover { opacity: 1; }
.catalog-row-na { color: var(--c-text-light); }

/* ── Pagination ──────────────────────────────────────────────────────────── */
.catalog-pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; margin-top: 32px;
}
.page-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  border-radius: 6px; font-size: 13px;
  color: var(--c-text-medium); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.page-btn:hover:not(:disabled) { border-color: var(--c-primary); color: var(--c-primary); }
.page-btn.active { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-ellipsis { min-width: 32px; text-align: center; color: var(--c-text-light); font-size: 13px; }

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .cfb-search { width: 180px; }
}
@media (max-width: 900px) {
  .cfb { padding: 0 16px; }
  .cfb-search { width: 150px; }
  .cfb-row2 { gap: 4px; }
  .catalog-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
}
@media (max-width: 640px) {
  .catalog-inner { padding: 0 12px; }
  .cfb { padding: 0 12px; }
  .cfb-search { display: none; }
  .cfb-row2 { flex-wrap: wrap; }
  .cfb-reset { margin-left: 0; }
  .catalog-grid { grid-template-columns: 1fr 1fr; }
  .catalog-row-name { max-width: 200px; }
}
</style>
