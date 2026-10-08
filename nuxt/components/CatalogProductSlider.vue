<script setup lang="ts">
import { getCatalogProductImagePath } from '~/utils/productImagePath'

interface CatalogProduct {
  id: string
  category: string
  subcategory: string | null
  product_name: string
  description: string | null
  image_path: string | null
  series: string | null
}

const props = defineProps<{
  /** catalog_products.category string — e.g. 'Air Coolers', 'Dry Coolers' */
  category: string
  /** Optional product id to exclude (the one already being configured) */
  excludeId?: string
  /** Max cards to fetch (default 14) */
  limit?: number
}>()

const { data, pending } = useFetch<{ ok: boolean; products: CatalogProduct[] }>(
  '/api/products/catalog-products',
  {
    query: computed(() => ({
      category: props.category,
      limit: props.limit ?? 14,
    })),
    watch: [() => props.category],
  }
)

const products = computed<CatalogProduct[]>(() => {
  if (!data.value?.ok) return []
  const all = data.value.products
  return props.excludeId ? all.filter(p => p.id !== props.excludeId) : all
})

const trackRef = ref<HTMLElement | null>(null)
const canScrollLeft  = ref(false)
const canScrollRight = ref(false)

function updateArrows() {
  const el = trackRef.value
  if (!el) return
  canScrollLeft.value  = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 4
}

watch(products, async () => {
  await nextTick()
  updateArrows()
})

onMounted(() => {
  nextTick(updateArrows)
})

function scroll(dir: 'left' | 'right') {
  if (!trackRef.value) return
  trackRef.value.scrollBy({ left: dir === 'left' ? -264 : 264, behavior: 'smooth' })
  setTimeout(updateArrows, 320)
}

const { openProductInChat } = useProductChatTrigger()

function openProduct(p: CatalogProduct) {
  openProductInChat({
    productName:  p.product_name,
    category:     p.category,
    subcategory:  p.subcategory,
    series:       p.series,
    description:  p.description,
    imagePath:    getCatalogProductImagePath({ product_name: p.product_name, image_path: p.image_path }),
  })
}
</script>

<template>
  <section v-if="!pending && products.length" class="ps">
    <div class="ps-head">
      <div class="ps-head-text">
        <span class="ps-label">You might also like</span>
        <span class="ps-sub">More products from this category</span>
      </div>
      <div class="ps-arrows">
        <button
          class="ps-arrow"
          :disabled="!canScrollLeft"
          aria-label="Previous"
          type="button"
          @click="scroll('left')"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="ps-arrow"
          :disabled="!canScrollRight"
          aria-label="Next"
          type="button"
          @click="scroll('right')"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="ps-track-wrap">
      <div
        ref="trackRef"
        class="ps-track"
        @scroll.passive="updateArrows"
      >
        <button
          v-for="p in products"
          :key="p.id"
          type="button"
          class="ps-card"
          @click="openProduct(p)"
        >
          <div class="ps-card-img">
            <img
              v-if="p.image_path"
              :src="p.image_path"
              :alt="p.product_name"
              class="ps-img"
            />
            <div v-else class="ps-img-ph">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="6" y="10" width="36" height="28" rx="3"/>
                <path d="M6 30l9-9 7 7 6-6 10 9"/>
                <circle cx="33" cy="18" r="3.5"/>
              </svg>
            </div>
          </div>
          <div class="ps-card-body">
            <span class="ps-card-cat">{{ p.category }}</span>
            <span class="ps-card-name">{{ p.product_name }}</span>
            <span class="ps-card-desc">{{ p.description ?? p.subcategory ?? '' }}</span>
          </div>
        </button>
      </div>

      <!-- fade edges -->
      <div class="ps-fade ps-fade-left"  :class="{ visible: canScrollLeft }" />
      <div class="ps-fade ps-fade-right" :class="{ visible: canScrollRight }" />
    </div>
  </section>
</template>

<style scoped>
.ps {
  padding: 24px 0 8px;
  border-top: 1px solid var(--c-border, #d8d8d8);
}

/* ---- header ---- */
.ps-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 16px;
}
.ps-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ps-label {
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-xs, 15.69px);
  font-weight: 700;
  color: var(--c-text-value, #262326);
  line-height: 1.3;
}
.ps-sub {
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium, #636362);
  line-height: 1.4;
}

/* ---- arrow buttons ---- */
.ps-arrows {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.ps-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--c-border, #d8d8d8);
  border-radius: var(--radius-xs, 4px);
  background: var(--c-surface, #fff);
  color: var(--c-text-value, #262326);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}
.ps-arrow:hover:not(:disabled) {
  border-color: var(--c-brand-blue, #2666e0);
  color: var(--c-brand-blue, #2666e0);
  background: color-mix(in srgb, var(--c-brand-blue, #2666e0) 6%, white);
}
.ps-arrow:disabled {
  opacity: 0.3;
  cursor: default;
}

/* ---- track ---- */
.ps-track-wrap {
  position: relative;
}
.ps-track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 6px;
}
.ps-track::-webkit-scrollbar { display: none; }

/* ---- fade overlays ---- */
.ps-fade {
  position: absolute;
  top: 0;
  bottom: 6px;
  width: 40px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s;
}
.ps-fade.visible { opacity: 1; }
.ps-fade-left {
  left: 0;
  background: linear-gradient(to right, var(--c-bg, #fafafa), transparent);
}
.ps-fade-right {
  right: 0;
  background: linear-gradient(to left, var(--c-bg, #fafafa), transparent);
}

/* ---- cards ---- */
.ps-card {
  flex-shrink: 0;
  scroll-snap-align: start;
  width: 220px;
  background: var(--c-surface, #fff);
  border: 1px solid var(--c-border, #d8d8d8);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  text-align: left;
  padding: 0;
  overflow: hidden;
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.08s;
}
.ps-card:hover {
  border-color: var(--c-brand-blue, #2666e0);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--c-brand-blue, #2666e0) 14%, transparent);
  transform: translateY(-2px);
}
.ps-card:active {
  transform: translateY(0);
}

/* image area */
.ps-card-img {
  width: 100%;
  height: 140px;
  background: var(--c-bg, #fafafa);
  border-bottom: 1px solid var(--c-border, #d8d8d8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ps-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 12px;
  box-sizing: border-box;
}
.ps-img-ph {
  color: var(--c-border, #d8d8d8);
}

/* card body */
.ps-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px 14px;
}
.ps-card-cat {
  display: inline-block;
  font-family: var(--font-ui, sans-serif);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-brand-blue, #2666e0);
  line-height: 1.2;
}
.ps-card-name {
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-2xs, 14.17px);
  font-weight: 600;
  color: var(--c-text-value, #262326);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ps-card-desc {
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium, #636362);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 640px) {
  .ps-card { width: 180px; }
  .ps-card-img { height: 110px; }
}
</style>
