<script setup lang="ts">
/**
 * /spare-parts/:id — Spare-part detail page (DB-backed).
 */

type Availability = 'in-stock' | 'out-of-stock' | 'not-available' | 'no-longer-available'

interface DocRef {
  id: string
  name: string
  type: string
  dmsId: string | null
  source: string
}

interface DBSparePart {
  id: number
  code: string
  description: string | null
  category: string | null
  sub_category: string | null
  price: number | null
  price_strike: number | null
  availability: string
  series_codes: string[] | null
  specs: Record<string, any> | null
  doc_ids?: string[]
  notes?: string | null
  docs?: DocRef[]
}

const AVAILABILITY_LABEL: Record<string, string> = {
  'in-stock': 'In Stock',
  'out-of-stock': 'Out of Stock',
  'not-available': 'Not Available',
  'no-longer-available': 'No Longer Available'
}

const route  = useRoute()
const router = useRouter()

const id      = computed(() => String(route.params.id))
const loading = ref(true)
const product = ref<DBSparePart | null>(null)

useHead(() => ({
  title: product.value ? `myGüntner — ${product.value.code}` : 'myGüntner — Spare part'
}))

onMounted(async () => {
  try {
    const res = await $fetch<{ ok: boolean; part: DBSparePart | null }>(`/api/spare-parts/${id.value}`)
    if (res.ok && res.part) {
      product.value = res.part
    } else {
      router.replace('/spare-parts')
    }
  } catch {
    router.replace('/spare-parts')
  }
  loading.value = false
})

// ---------- Derived detail-page data ----------

function fmtEur(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

// specPairs from JSONB specs field
const specPairs = computed(() => {
  const p = product.value
  if (!p) return []
  const pairs: { label: string; value: string }[] = []
  if (p.sub_category) pairs.push({ label: 'Sub-category', value: p.sub_category })
  const sc = Array.isArray(p.series_codes) ? p.series_codes : []
  if (sc.length) pairs.push({ label: 'Compatible series', value: sc.join(', ') })
  if (p.specs && typeof p.specs === 'object') {
    for (const [k, v] of Object.entries(p.specs)) {
      if (v != null && v !== '') pairs.push({ label: String(k), value: String(v) })
    }
  }
  return pairs
})

const price        = computed(() => fmtEur(product.value?.price ?? null))
const priceStrike  = computed(() => product.value?.price_strike != null ? fmtEur(product.value.price_strike) : null)
const availability = computed<Availability>(() => (product.value?.availability ?? 'not-available') as Availability)

// Documents (resolved from doc_ids via API)
const docsCount    = computed(() => product.value?.docs?.length ?? 0)
const documents    = computed(() => product.value?.docs ?? [])
const showAllDocs  = ref(false)
const visibleDocs  = computed(() => showAllDocs.value ? documents.value : documents.value.slice(0, 3))

function docHref(doc: DocRef): string {
  return doc.dmsId ? `/api/dms/content/${doc.dmsId}` : `/api/documents/${doc.id}/download`
}

// No DB-backed related parts yet
const requiredParts  = computed(() => [])
const showAllRequired = ref(false)
const visibleRequired = computed(() => [])

const heroIndex  = ref(0)
const heroSlides = 4
function heroPrev() { heroIndex.value = (heroIndex.value - 1 + heroSlides) % heroSlides }
function heroNext() { heroIndex.value = (heroIndex.value + 1) % heroSlides }

function addToCart() { /* wire to cart service */ }
function checkCompatibility() { /* placeholder */ }
</script>

<template>
  <div v-if="loading" class="detail">
    <p class="empty-state">Loading…</p>
  </div>
  <div v-else-if="product" class="detail">
    <!-- Breadcrumbs -->
    <nav class="crumbs" aria-label="Breadcrumb">
      <NuxtLink to="/overview" class="crumb">Overview</NuxtLink>
      <span class="crumb-sep">/</span>
      <NuxtLink to="/spare-parts" class="crumb">Spare parts</NuxtLink>
      <span class="crumb-sep">/</span>
      <NuxtLink to="/spare-parts" class="crumb">{{ product.category }}</NuxtLink>
      <span class="crumb-sep">/</span>
      <span class="crumb crumb--current">{{ product.code }}</span>
    </nav>

    <!-- Hero: image + info card -->
    <section class="hero">
      <div class="hero-image">
        <SparePartThumb kind="box" :size="480" contain />
        <div class="hero-pagination">
          <div class="dots">
            <span
              v-for="n in heroSlides"
              :key="n"
              class="dot"
              :class="{ 'dot--active': n - 1 === heroIndex }"
              @click="heroIndex = n - 1"
            />
          </div>
          <button type="button" class="pager-btn" aria-label="Previous image" @click="heroPrev">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l-5 5 5 5"/></svg>
          </button>
          <button type="button" class="pager-btn" aria-label="Next image" @click="heroNext">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5l5 5-5 5"/></svg>
          </button>
        </div>
      </div>

      <aside class="hero-card">
        <div class="hero-card-top">
          <div class="brand-cluster">
            <div class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M6 12h12M12 6v12"/></svg>
            </div>
          </div>
          <div class="hero-tools">
            <button type="button" class="icon-btn" aria-label="Save to project">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h9l3 3v9l-6-3-6 3z"/></svg>
            </button>
            <button type="button" class="icon-btn" aria-label="Favorite">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 15.9l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/></svg>
            </button>
            <button type="button" class="icon-btn" aria-label="Share">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="4.5" r="2"/><circle cx="5" cy="10" r="2"/><circle cx="15" cy="15.5" r="2"/><path d="M6.7 9l6.6-3.4M6.7 11l6.6 3.4"/></svg>
            </button>
          </div>
        </div>

        <div class="hero-heading">
          <p class="hero-category">{{ product.category }}</p>
          <h1 class="hero-code">{{ product.code }}</h1>
        </div>

        <div class="hero-price">
          <span class="hp-current">{{ price }}</span>
          <span v-if="priceStrike" class="hp-was">{{ priceStrike }}</span>
        </div>

        <div class="hero-divider" />

        <dl class="hero-specs">
          <template v-for="(pair, i) in specPairs" :key="i">
            <dt>{{ pair.label }}</dt>
            <dd>{{ pair.value }}</dd>
          </template>
        </dl>

        <div class="hero-divider" />

        <div class="hero-meta">
          <div class="meta-row">
            <span class="meta-label">Availability</span>
            <span class="meta-value">
              <span class="sp-badge" :class="`sp-badge--${availability}`">{{ AVAILABILITY_LABEL[availability] }}</span>
            </span>
          </div>
          <div v-if="product.description" class="meta-row">
            <span class="meta-label">Description</span>
            <span class="meta-value">{{ product.description }}</span>
          </div>
        </div>

        <button type="button" class="cta cta--primary" @click="addToCart">
          <span>Add to cart</span>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="7" cy="17" r="1.2"/><circle cx="14" cy="17" r="1.2"/>
            <path d="M2.5 3.5h2l2.2 10h9l2-7h-11"/>
          </svg>
        </button>
        <button type="button" class="cta cta--link" @click="checkCompatibility">
          <span>Check part compatibility</span>
        </button>
      </aside>
    </section>

    <!-- Required included parts -->
    <section v-if="requiredParts.length" class="section section--muted">
      <h2 class="section-title">Required included parts ({{ requiredParts.length }})</h2>
      <div class="required-grid">
        <div v-for="(p, i) in visibleRequired" :key="`req-${i}-${p.code}`" class="required-card">
          <SparePartThumb :kind="p.thumb" :size="48" />
          <div>
            <p class="req-category">{{ p.category }}</p>
            <p class="req-code">{{ p.code }}</p>
          </div>
        </div>
      </div>
      <button v-if="requiredParts.length > 3" type="button" class="show-more-btn" @click="showAllRequired = !showAllRequired">
        <span>{{ showAllRequired ? 'Show less' : 'Show more' }}</span>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showAllRequired ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }"><path d="M4 6l4 4 4-4"/></svg>
      </button>
    </section>

    <!-- Technical details -->
    <section id="technical" class="section">
      <h2 class="section-title">Technical details</h2>
      <div v-if="specPairs.length" class="tech-table-wrap">
        <table class="tech-table">
          <thead>
            <tr><th>Property</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr v-for="(pair, i) in specPairs" :key="i">
              <td>{{ pair.label }}</td>
              <td>{{ pair.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="tech-empty">No detailed technical values available for this part yet.</p>
    </section>

    <!-- Documents -->
    <section id="documents" class="section section--muted">
      <h2 class="section-title">Documents ({{ docsCount }})</h2>
      <div class="docs-grid">
        <article v-for="(doc, i) in visibleDocs" :key="`doc-${i}`" class="doc-card">
          <p class="doc-tag">{{ doc.type || 'Document' }}</p>
          <p class="doc-title">{{ doc.name }}</p>
          <p class="doc-meta">{{ doc.source === 'dms' ? 'DMS' : 'Upload' }}</p>
          <a :href="docHref(doc)" target="_blank" rel="noopener" class="doc-download" aria-label="Download document">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10M6 9l4 4 4-4M4 16h12"/></svg>
          </a>
        </article>
      </div>
      <button v-if="documents.length > 3" type="button" class="show-more-btn" @click="showAllDocs = !showAllDocs">
        <span>{{ showAllDocs ? 'Show less' : 'Show more' }}</span>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showAllDocs ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }"><path d="M4 6l4 4 4-4"/></svg>
      </button>
    </section>

    <p class="disclaimer">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4"/><circle cx="8" cy="4.75" r="0.4" fill="currentColor" stroke="none"/></svg>
      <span>All products are provided by Seller subject to the German Foreign Trade Act/German Foreign Trade Ordinance/EC Dual-Use Regulations as amended from time to time and are intended for use and to remain in the country of delivery agreed with the Customer. In the case of any onward transport, we kindly ask you to observe the currently applicable embargo measures and sanctions.</span>
    </p>
  </div>
</template>

<style scoped>
.detail {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* --------- Breadcrumbs --------- */
.crumbs { display: flex; gap: 8px; align-items: center; font-size: var(--font-2xs); }
.crumb  { color: var(--c-text-medium); text-decoration: none; }
.crumb:hover:not(.crumb--current) { color: var(--c-brand-blue); }
.crumb--current { color: var(--c-text); font-weight: 500; }
.crumb-sep { color: var(--c-text-light); }

/* --------- Hero --------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 460px;
  gap: var(--space-sm);
}
.hero-image {
  position: relative;
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 540px;
  padding: var(--space-lg);
  isolation: isolate;
}
.hero-pagination {
  position: absolute;
  right: var(--space-xs);
  bottom: var(--space-xs);
  display: flex;
  align-items: center;
  gap: var(--space-a8);
}
.dots { display: inline-flex; gap: 6px; align-items: center; }
.dot  { width: 6px; height: 6px; border-radius: 999px; background: var(--c-border-dark); cursor: pointer; transition: width 0.15s, background 0.15s; }
.dot--active { width: 24px; background: var(--c-brand-blue); }
.pager-btn {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  border: none;
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s;
}
.pager-btn:hover { background: color-mix(in srgb, var(--c-brand-blue) 20%, white); }

/* --------- Hero card --------- */
.hero-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.hero-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand-cluster { display: inline-flex; align-items: center; gap: 8px; }
.brand-mark {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--c-text-medium);
  background: var(--c-surface-alt);
  border-radius: 999px;
}
.kit-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--c-surface-alt);
  color: var(--c-text);
  font-size: var(--font-3xs);
}
.kit-badge-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--c-brand-dark-grey);
  color: white;
  border-radius: 999px;
  font-size: var(--font-4xs);
  font-weight: 500;
}
.hero-tools { display: inline-flex; gap: 4px; }
.icon-btn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  color: var(--c-text-medium);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.icon-btn:hover { background: var(--c-surface-alt); color: var(--c-text); }

.hero-heading { display: flex; flex-direction: column; gap: 4px; }
.hero-category { margin: 0; color: var(--c-text-medium); font-size: var(--font-3xs); }
.hero-code {
  margin: 0;
  font-family: var(--font-headline);
  font-size: var(--font-4xl);
  color: var(--c-brand-blue);
  line-height: 100%;
  font-weight: 500;
}

.hero-price { display: inline-flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.hp-current { font-size: var(--font-lg); font-weight: 500; color: var(--c-text); }
.hp-was     { font-size: var(--font-2xs); color: var(--c-text-medium); text-decoration: line-through; }
.hp-savings {
  display: inline-flex; align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, #B33A3A 12%, white);
  color: #B33A3A;
  font-size: var(--font-3xs);
  font-weight: 500;
}

.hero-subcode { margin: 0; color: var(--c-text-medium); font-family: var(--font-mono); font-size: var(--font-3xs); }
.hero-divider { height: 1px; background: var(--c-border-card); margin: 4px 0; }

.hero-specs {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 20px;
  margin: 0;
  font-size: var(--font-2xs);
}
.hero-specs dt { color: var(--c-text-medium); font-weight: 400; }
.hero-specs dd { margin: 0; color: var(--c-text); font-weight: 500; }

.hero-meta { display: flex; flex-direction: column; gap: 10px; }
.meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr 24px;
  gap: 12px;
  align-items: center;
  font-size: var(--font-2xs);
}
.meta-label { color: var(--c-text-medium); }
.meta-value { color: var(--c-text); }
.meta-jump {
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  color: var(--c-text-medium);
  border-radius: var(--radius-xs2);
  cursor: pointer;
  text-decoration: none;
}
.meta-jump:hover { background: var(--c-surface-alt); color: var(--c-brand-blue); }

.sp-badge {
  display: inline-flex; align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: var(--font-3xs);
  font-weight: 500;
  line-height: 14px;
}
.sp-badge--in-stock            { background: color-mix(in srgb, #2E7D4F 15%, white); color: #2E7D4F; }
.sp-badge--out-of-stock        { background: color-mix(in srgb, #B33A3A 15%, white); color: #B33A3A; }
.sp-badge--not-available       { background: var(--c-surface-alt); color: var(--c-text-medium); }
.sp-badge--no-longer-available { background: color-mix(in srgb, var(--c-text-medium) 20%, white); color: var(--c-text-medium); }

.cta {
  height: 44px;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: none;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.12s, background 0.12s, color 0.12s;
}
.cta--primary { background: var(--c-brand-blue); color: var(--c-text-inverted); }
.cta--primary:hover { filter: brightness(1.05); }
.cta--link { background: transparent; color: var(--c-brand-blue); height: 32px; }
.cta--link:hover { text-decoration: underline; }

/* --------- Sections --------- */
.section {
  padding: var(--space-md);
  border-radius: var(--radius-xs);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.section--muted { background: var(--c-surface-alt); }
.section-title  {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  font-size: var(--font-3xl);
  color: var(--c-text);
  line-height: 100%;
}

/* Required parts grid */
.required-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-xs);
}
.required-card {
  display: flex;
  align-items: center;
  gap: var(--space-a8);
  padding: var(--space-xs);
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  cursor: default;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.required-card:hover {
  border-color: var(--c-brand-blue);
  box-shadow: 0 2px 8px rgba(38, 102, 224, 0.08);
}
.req-category { margin: 0; color: var(--c-text-medium); font-size: var(--font-3xs); line-height: 14px; }
.req-code     { margin: 2px 0 0; color: var(--c-text); font-size: var(--font-2xs); font-weight: 500; }

.show-more-btn {
  align-self: center;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
  cursor: pointer;
}
.show-more-btn:hover { color: var(--c-brand-blue); }

/* Technical details table */
.tech-table-wrap { background: white; border-radius: var(--radius-xs); overflow-x: auto; }
.tech-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  min-width: 720px;
}
.tech-table thead th {
  padding: 12px 16px;
  text-align: left;
  color: var(--c-text-medium);
  font-weight: 500;
  font-size: var(--font-3xs);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}
.tech-table tbody td {
  padding: 14px 16px;
  color: var(--c-text);
  border-bottom: 1px solid var(--c-border-card);
}
.tech-table tbody tr:last-child td { border-bottom: none; }
.tech-empty  { color: var(--c-text-medium); font-size: var(--font-2xs); margin: 0; }
.empty-state { color: var(--c-text-medium); font-size: var(--font-2xs); padding: var(--space-lg); text-align: center; }

/* Documents */
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-xs);
}
.doc-card {
  position: relative;
  padding: var(--space-xs);
  padding-right: 48px;
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: default;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.doc-card:hover { border-color: var(--c-brand-blue); box-shadow: 0 2px 8px rgba(38, 102, 224, 0.08); }
.doc-tag   { margin: 0; color: var(--c-text-medium); font-size: var(--font-4xs); text-transform: uppercase; letter-spacing: 0.4px; }
.doc-title { margin: 0; color: var(--c-text); font-size: var(--font-2xs); font-weight: 500; word-break: break-word; }
.doc-meta  { margin: 0; color: var(--c-text-medium); font-size: var(--font-3xs); }
.doc-download {
  position: absolute;
  right: var(--space-xs);
  top: 50%;
  transform: translateY(-50%);
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  color: var(--c-brand-blue);
  border: none;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s;
}
.doc-download:hover { background: color-mix(in srgb, var(--c-brand-blue) 20%, white); }

/* Disclaimer */
.disclaimer {
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  line-height: 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border-top: 1px solid var(--c-border-card);
}
.disclaimer svg { flex-shrink: 0; color: var(--c-text-medium); margin-top: 1px; }

/* Responsive */
@media (max-width: 1100px) {
  .hero { grid-template-columns: 1fr; }
  .hero-image { min-height: 380px; }
  .hero-card { max-width: 100%; }
}
</style>
