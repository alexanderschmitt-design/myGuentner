<script setup lang="ts">
/**
 * Step 1 — Category selection.
 *
 * 6-card grid matching layouts/myGPC - Category - Internal user - Desktop (Default).png:
 * Evaporator (DX/Pump), Air Cooler, Dry Cooler, Condenser, Gas Cooler.
 *
 * Each card ties to `productSection` + a `productcategories` filter for the GPC.EU
 * find-endpoints. Values below are derived from rag/gpc-field-mapping.md.
 */

useHead({ title: 'myGPC — Category' })

const store = useConfigStore()
const router = useRouter()

interface Category {
  slug: string
  title: string
  sublabel: string
  icon: string
  buttonLabel: string
  modelCodes: string
  productSection: 1 | 2       // 1 = unit, 2 = bare coil
  categoryId: number | null   // GPC.EU productcategories id (null until confirmed)
}

const CATEGORIES: Category[] = [
  {
    slug: 'evaporator-dx',
    title: 'Evaporator',
    sublabel: 'DX',
    icon: '/icons/coil-evaporator-dx.svg',
    buttonLabel: 'Evaporator',
    modelCodes: 'GACC CX · GHCC · GHF · GHN · GVH · GHFV · GVHW · GVFV · GHFF',
    productSection: 1,
    categoryId: 0
  },
  {
    slug: 'evaporator-pump',
    title: 'Evaporator',
    sublabel: 'Pump',
    icon: '/icons/coil-evaporator-pump.svg',
    buttonLabel: 'Evaporator',
    modelCodes: 'GACC PX · GHCC · GHF · GHN · GVH · GHFV · GVHW',
    productSection: 1,
    categoryId: 1
  },
  {
    slug: 'air-cooler',
    title: 'Air cooler',
    sublabel: '',
    icon: '/icons/coil-air-cooler.svg',
    buttonLabel: 'Air cooler',
    modelCodes: 'GAMC · GASC · GADC · GACC · GACV · GADP',
    productSection: 1,
    categoryId: 2
  },
  {
    slug: 'dry-cooler',
    title: 'Dry cooler',
    sublabel: '',
    icon: '/icons/coil-dry-cooler.svg',
    buttonLabel: 'Dry cooler',
    modelCodes: 'GFH · GFD · GFDC · GFN',
    productSection: 1,
    categoryId: 3
  },
  {
    slug: 'condenser',
    title: 'Condenser',
    sublabel: '',
    icon: '/icons/coil-condenser.svg',
    buttonLabel: 'Condenser',
    modelCodes: 'AGVH · GCVC · GCHC · GVHR',
    productSection: 1,
    categoryId: 4
  },
  {
    slug: 'gas-cooler',
    title: 'Gas cooler',
    sublabel: 'CO₂',
    icon: '/icons/product-gascooler.svg',
    buttonLabel: 'Gas cooler',
    modelCodes: 'GGHC · GGVC · GGHV',
    productSection: 1,
    categoryId: 5
  }
]

// Live API check — non-blocking, log only. Fallback to hardcoded CATEGORIES above.
const { data: apiCats, error: apiError } = await useAsyncData(
  'mygps-categories',
  () => useGpceu().productCategories(2).catch(() => null),
  { default: () => null }
)

function pickCategory(c: Category) {
  store.currentCategory = c.slug
  store.currentSubcategory = null
  // Persist selected productSection so downstream API calls use it.
  router.push('/mygps/inputs')
}
</script>

<template>
  <div class="cat-page">
    <div class="card-grid">
      <button
        v-for="c in CATEGORIES"
        :key="c.slug"
        class="cat-card"
        :class="{ 'is-selected': store.currentCategory === c.slug }"
        @click="pickCategory(c)"
      >
        <div class="card-image">
          <img :src="c.icon" :alt="c.title" />
          <span v-if="c.sublabel" class="sublabel">{{ c.sublabel }}</span>
        </div>
        <div class="card-body">
          <div class="cta">{{ c.buttonLabel }}</div>
          <p class="model-codes">{{ c.modelCodes }}</p>
        </div>
      </button>
    </div>

    <div class="footer-actions">
      <button class="btn btn-outline">
        <span aria-hidden="true">⬆</span> Upload Desktop GPC calculation
      </button>
    </div>

    <details v-if="apiCats?.length" class="api-debug">
      <summary>{{ apiCats.length }} categories from GPC.EU API (live)</summary>
      <pre>{{ JSON.stringify(apiCats.slice(0, 5), null, 2) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.cat-page {
  max-width: 1200px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 900px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .card-grid { grid-template-columns: 1fr; } }

.cat-card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.cat-card:hover {
  border-color: var(--c-primary);
  box-shadow: 0 4px 12px rgba(0, 56, 101, 0.08);
  transform: translateY(-1px);
}
.cat-card.is-selected {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary);
}

.card-image {
  position: relative;
  aspect-ratio: 3 / 2;
  background: var(--c-surface-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.card-image img {
  max-width: 60%;
  max-height: 60%;
  object-fit: contain;
}
.sublabel {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--c-text);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'DM Mono', monospace;
}

.card-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cta {
  background: var(--c-brand-blue);
  color: white;
  padding: 10px 16px;
  border-radius: var(--radius);
  font-weight: 500;
  text-align: center;
  font-size: 0.95rem;
  transition: filter 0.15s;
}
.cat-card:hover .cta { filter: brightness(1.08); }

.model-codes {
  margin: 0;
  font-size: 0.75rem;
  color: var(--c-text-muted);
  line-height: 1.4;
  font-family: 'DM Mono', monospace;
}

.footer-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-start;
}

.api-debug {
  margin-top: 32px;
  padding: 12px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  font-size: 0.85rem;
}
.api-debug pre {
  background: var(--c-surface-muted);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  overflow: auto;
}
</style>
