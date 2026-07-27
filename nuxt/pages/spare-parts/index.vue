<script setup lang="ts">
/**
 * /spare-parts — mySpareParts portal page.
 *
 * Layout mirrors Figma file WHGL55cJW0T7FwpmczbwB0, node 4338:42144:
 *   Header   — "Spare parts" title + search
 *   Filters  — All spare parts / Fans / Heating elements / Other
 *   Table    — Product (illustrated thumbnail + code), Description, Specification,
 *              Dimension, Availability, Price, Actions
 *              (rows with linked / recommended parts expand smoothly on click)
 *   Footer   — Pagination + GTC disclaimer
 */

import type { PartRow, PartFilter, AccessoryRow } from '~/composables/useSparePartsData'
import { AVAILABILITY_LABEL, useSparePartsData } from '~/composables/useSparePartsData'

useHead({ title: 'myGüntner — Spare Parts' })

const { rows: ROWS } = useSparePartsData()

const activeFilter = ref<PartFilter>('all')
const search       = ref('')
const expanded     = ref<Set<string>>(new Set())
const pricingOpen  = ref<string | null>(null)
const currentPage  = ref(3)
const totalPages   = 5

function partMatchesFilter(row: PartRow): boolean {
  if (activeFilter.value === 'all')     return true
  if (activeFilter.value === 'fans')    return row.thumb === 'fan' || row.thumb === 'fan-alt' || row.category === 'Fan'
  if (activeFilter.value === 'heating') return row.category.toLowerCase().includes('heat')
  return !row.category.toLowerCase().includes('heat') && row.category !== 'Fan'
}

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return ROWS.filter(r => {
    if (!partMatchesFilter(r)) return false
    if (q && !`${r.code} ${r.description} ${r.category}`.toLowerCase().includes(q)) return false
    return true
  })
})

function toggleRow(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function togglePricing(id: string) {
  pricingOpen.value = pricingOpen.value === id ? null : id
}
function closePricing() { pricingOpen.value = null }

onMounted(() => {
  const onDocClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.sp-info-btn, .sp-pricing-popover')) closePricing()
  }
  document.addEventListener('click', onDocClick)
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
})

function goPage(n: number) {
  if (n < 1 || n > totalPages) return
  currentPage.value = n
}

const rowQty = ref<Record<string, number>>({})
function qtyFor(id: string, initial = 1): number { return rowQty.value[id] ?? initial }
function setQty(id: string, next: number)     { rowQty.value = { ...rowQty.value, [id]: Math.max(0, next) } }

function addToCart(_r: PartRow | AccessoryRow) { /* wire to cart service */ }

const availabilityLabel = AVAILABILITY_LABEL

interface AccSection {
  role: 'required' | 'recommended'
  label: string
  priceLabel: string
  items: AccessoryRow[]
}
function accSections(r: PartRow): AccSection[] {
  const acc = r.accessories || []
  const req: AccSection = { role: 'required',    label: 'Required product',    priceLabel: 'Price already included', items: acc.filter(a => a.role === 'required') }
  const rec: AccSection = { role: 'recommended', label: 'Recommended product', priceLabel: 'Price not included',     items: acc.filter(a => a.role === 'recommended') }
  return [req, rec].filter(s => s.items.length)
}
</script>

<template>
  <div class="spare-parts">
    <header class="sp-header">
      <h1 class="headline headline--section">Spare parts</h1>

      <div class="sp-header-actions">
        <label class="sp-search">
          <span class="sp-search-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="9" r="6"/>
              <line x1="13.5" y1="13.5" x2="17" y2="17"/>
            </svg>
          </span>
          <input v-model="search" type="search" placeholder="Search" aria-label="Search spare parts" />
        </label>
        <div class="sp-view-toggle" role="group" aria-label="View mode">
          <button type="button" class="sp-view-btn active" aria-label="List view">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M4 10h12M4 14h12"/></svg>
          </button>
          <button type="button" class="sp-view-btn" aria-label="Grid view">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/>
              <rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <nav class="sp-tabs" role="tablist" aria-label="Spare-part filter">
      <button type="button" role="tab" class="sp-tab" :class="{ active: activeFilter === 'all' }"     :aria-selected="activeFilter === 'all'"     @click="activeFilter = 'all'">All spare parts</button>
      <button type="button" role="tab" class="sp-tab" :class="{ active: activeFilter === 'fans' }"    :aria-selected="activeFilter === 'fans'"    @click="activeFilter = 'fans'">Fans</button>
      <button type="button" role="tab" class="sp-tab" :class="{ active: activeFilter === 'heating' }" :aria-selected="activeFilter === 'heating'" @click="activeFilter = 'heating'">Heating elements</button>
      <button type="button" role="tab" class="sp-tab" :class="{ active: activeFilter === 'other' }"   :aria-selected="activeFilter === 'other'"   @click="activeFilter = 'other'">Other</button>
    </nav>

    <div class="sp-table-wrap">
      <table class="sp-table">
        <thead>
          <tr>
            <th class="sp-col-product">Product</th>
            <th>Description</th>
            <th>Specification</th>
            <th>Dimension</th>
            <th>Availability</th>
            <th>Price</th>
            <th class="sp-col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="r in filteredRows" :key="r.id">
            <tr
              class="sp-row"
              :class="{ 'sp-row--expanded': expanded.has(r.id), 'sp-row--expandable': r.accessories && r.accessories.length }"
              @click="r.accessories && r.accessories.length ? toggleRow(r.id) : undefined"
            >
              <td class="sp-cell-product">
                <div class="sp-expand-slot">
                  <button
                    v-if="r.accessories && r.accessories.length"
                    type="button"
                    class="sp-expand-btn"
                    :class="{ 'sp-expand-btn--open': expanded.has(r.id) }"
                    :aria-expanded="expanded.has(r.id)"
                    :aria-label="expanded.has(r.id) ? 'Collapse row' : 'Expand row'"
                    @click.stop="toggleRow(r.id)"
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 6l4 4 4-4"/>
                    </svg>
                  </button>
                </div>
                <NuxtLink :to="`/spare-parts/${r.id}`" class="sp-thumb-link" @click.stop>
                  <SparePartThumb :kind="r.thumb" />
                </NuxtLink>
                <span class="sp-code-block">
                  <span class="sp-kind">{{ r.category }}</span>
                  <NuxtLink :to="`/spare-parts/${r.id}`" class="sp-code sp-code--link" @click.stop>{{ r.code }}</NuxtLink>
                  <span v-if="r.replacementFor" class="sp-replacement">
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 8a5 5 0 0 1 9-3M13 8a5 5 0 0 1-9 3"/>
                      <path d="M12 2v3h-3M4 14v-3h3"/>
                    </svg>
                    <span>Replacement for {{ r.replacementFor }}</span>
                  </span>
                </span>
              </td>
              <td class="sp-cell-desc">{{ r.description }}</td>
              <td>
                <div class="sp-spec">
                  <ul>
                    <li v-for="(s, i) in r.specColumns[0]" :key="`a-${i}`">{{ s }}</li>
                  </ul>
                  <ul>
                    <li v-for="(s, i) in r.specColumns[1]" :key="`b-${i}`">{{ s }}</li>
                  </ul>
                </div>
              </td>
              <td>
                <div class="sp-dim">
                  <span class="sp-dim-label">{{ r.dimensionLabel }}</span>
                  <span class="sp-dim-value">{{ r.dimensionValue }}</span>
                </div>
              </td>
              <td>
                <span class="sp-badge" :class="`sp-badge--${r.availability}`">
                  <span v-if="r.availabilityCount">{{ r.availabilityCount }} </span>{{ availabilityLabel[r.availability] }}
                </span>
              </td>
              <td>
                <div class="sp-price-cell">
                  <span v-if="r.priceStrike" class="sp-price-was-line">
                    <span class="sp-price-was">{{ r.priceStrike }}</span>
                    <span v-if="r.savings" class="sp-price-savings">{{ r.savings }}</span>
                  </span>
                  <span class="sp-price">{{ r.price }}</span>
                  <button
                    v-if="r.hasPricingDetails"
                    type="button"
                    class="sp-info-btn"
                    :aria-expanded="pricingOpen === r.id"
                    aria-label="Pricing details"
                    @click.stop="togglePricing(r.id)"
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="8" cy="8" r="6.5"/><path d="M8 7v4"/><circle cx="8" cy="4.75" r="0.4" fill="currentColor" stroke="none"/>
                    </svg>
                    <span>Information</span>

                    <Transition name="pop">
                      <div v-if="pricingOpen === r.id && r.pricingDetails" class="sp-pricing-popover" @click.stop>
                        <div class="sp-pricing-title">Pricing Details</div>
                        <div v-for="(line, i) in r.pricingDetails"
                             :key="i"
                             class="sp-pricing-row"
                             :class="{ 'sp-pricing-row--total': i === r.pricingDetails.length - 1 }">
                          <span>{{ line.label }}</span>
                          <span>{{ line.value }}</span>
                        </div>
                      </div>
                    </Transition>
                  </button>
                </div>
              </td>
              <td class="sp-cell-actions">
                <template v-if="r.quantityEditable">
                  <button type="button" class="sp-qty-btn" aria-label="Remove one" @click.stop="setQty(r.id, qtyFor(r.id, r.quantity || 1) - 1)">
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 8h8"/></svg>
                  </button>
                  <span class="sp-qty-value">{{ qtyFor(r.id, r.quantity || 1) }}</span>
                  <button type="button" class="sp-qty-btn" aria-label="Add one" @click.stop="setQty(r.id, qtyFor(r.id, r.quantity || 1) + 1)">
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 4v8M4 8h8"/></svg>
                  </button>
                </template>
                <template v-else>
                  <button v-if="r.availability !== 'no-longer-available' && r.availability !== 'not-available'"
                          type="button"
                          class="sp-action-btn sp-action-btn--primary"
                          aria-label="Add to cart"
                          @click.stop="addToCart(r)">
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="7" cy="17" r="1.2"/><circle cx="14" cy="17" r="1.2"/>
                      <path d="M2.5 3.5h2l2.2 10h9l2-7h-11"/>
                    </svg>
                  </button>
                  <button v-else type="button" class="sp-action-btn sp-action-btn--primary" aria-label="Request offer" @click.stop="addToCart(r)">
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M4 4l12 6-12 6 3-6-3-6z"/></svg>
                  </button>
                </template>
                <button type="button" class="sp-action-btn sp-action-btn--ghost" aria-label="More actions" @click.stop>
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><circle cx="10" cy="4.5" r="1.3"/><circle cx="10" cy="10" r="1.3"/><circle cx="10" cy="15.5" r="1.3"/></svg>
                </button>
              </td>
            </tr>

            <!-- Accordion wrapper row: rendered when the row has accessories -->
            <tr v-if="r.accessories && r.accessories.length" class="sp-acc-tr">
              <td colspan="7" class="sp-acc-cell">
                <div class="sp-acc-wrap" :class="{ 'sp-acc-wrap--open': expanded.has(r.id) }">
                  <div class="sp-acc-inner">
                    <div v-for="section in accSections(r)" :key="section.role" class="sp-acc-section">
                      <div class="sp-acc-heads">
                        <span>{{ section.label }}</span>
                        <span>Description</span>
                        <span>Dimension</span>
                        <span>{{ section.role === 'required' ? 'Quantity' : 'Availability' }}</span>
                        <span>{{ section.priceLabel }}</span>
                        <span></span>
                      </div>

                      <div v-for="acc in section.items" :key="`${r.id}-${acc.code}`" class="sp-acc-row">
                        <div class="sp-acc-product">
                          <SparePartThumb :kind="acc.thumb" small />
                          <span class="sp-code-block">
                            <span class="sp-kind">{{ acc.category }}</span>
                            <span class="sp-code">{{ acc.code }}</span>
                          </span>
                        </div>
                        <div class="sp-acc-desc">{{ acc.description }}</div>
                        <div class="sp-dim">
                          <span class="sp-dim-label">{{ acc.dimensionLabel }}</span>
                          <span class="sp-dim-value">{{ acc.dimensionValue }}</span>
                        </div>
                        <div class="sp-acc-mid">
                          <template v-if="section.role === 'required'">
                            <span class="sp-acc-qty">{{ acc.quantity }}</span>
                          </template>
                          <template v-else>
                            <span v-if="acc.availability" class="sp-badge" :class="`sp-badge--${acc.availability}`">
                              <span v-if="acc.availabilityCount">{{ acc.availabilityCount }} </span>{{ availabilityLabel[acc.availability] }}
                            </span>
                          </template>
                        </div>
                        <div class="sp-acc-price">
                          <span v-if="acc.priceStrike" class="sp-price-was-line">
                            <span class="sp-price-was">{{ acc.priceStrike }}</span>
                            <span v-if="acc.savings" class="sp-price-savings">{{ acc.savings }}</span>
                          </span>
                          <span class="sp-price">{{ acc.price }}</span>
                        </div>
                        <div class="sp-acc-actions">
                          <template v-if="acc.quantityEditable">
                            <button type="button" class="sp-qty-btn" @click.stop="setQty(`${r.id}-${acc.code}`, qtyFor(`${r.id}-${acc.code}`, acc.quantity || 1) - 1)"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 8h8"/></svg></button>
                            <span class="sp-qty-value">{{ qtyFor(`${r.id}-${acc.code}`, acc.quantity || 1) }}</span>
                            <button type="button" class="sp-qty-btn" @click.stop="setQty(`${r.id}-${acc.code}`, qtyFor(`${r.id}-${acc.code}`, acc.quantity || 1) + 1)"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 4v8M4 8h8"/></svg></button>
                          </template>
                          <button v-else type="button" class="sp-action-btn sp-action-btn--primary" aria-label="Add to cart" @click.stop="addToCart(acc)">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="7" cy="17" r="1.2"/><circle cx="14" cy="17" r="1.2"/>
                              <path d="M2.5 3.5h2l2.2 10h9l2-7h-11"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="!filteredRows.length">
            <td class="empty" colspan="7">No spare parts match your filter.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="pagination" aria-label="Spare parts pagination">
      <button type="button" class="page-btn" :disabled="currentPage === 1" aria-label="Previous page" @click="goPage(currentPage - 1)">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l-5 5 5 5"/></svg>
      </button>
      <button
        v-for="n in totalPages"
        :key="n"
        type="button"
        class="page-btn page-btn--num"
        :class="{ active: n === currentPage }"
        @click="goPage(n)"
      >{{ n }}</button>
      <button type="button" class="page-btn" :disabled="currentPage === totalPages" aria-label="Next page" @click="goPage(currentPage + 1)">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5l5 5-5 5"/></svg>
      </button>
    </nav>

    <p class="sp-disclaimer">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4"/><circle cx="8" cy="4.75" r="0.4" fill="currentColor" stroke="none"/></svg>
      <span>All products are provided by Seller subject to the German Foreign Trade Act/German Foreign Trade Ordinance/EC Dual-Use Regulations as amended from time to time and are intended for use and to remain in the country of delivery agreed with the Customer. In the case of any onward transport, we kindly ask you to observe the currently applicable embargo measures and sanctions.</span>
    </p>
  </div>
</template>

<style scoped>
.spare-parts {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* --------- Header --------- */
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}
.sp-header-actions { display: flex; align-items: center; gap: var(--space-xs); }
.headline { margin: 0; font-family: var(--font-headline); font-weight: 400; color: var(--c-text); line-height: 100%; }
.headline--section { font-size: var(--font-4xl); }

.sp-search {
  display: inline-flex;
  align-items: center;
  gap: var(--space-a8);
  padding: 0 var(--space-xs);
  height: 40px;
  min-width: 320px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  transition: border-color 0.15s;
}
.sp-search:focus-within { border-color: var(--c-brand-blue); }
.sp-search-icon { color: var(--c-text-medium); display: inline-flex; }
.sp-search input {
  flex: 1 0 0; min-width: 0;
  border: none; background: transparent; outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
}
.sp-search input::placeholder { color: var(--c-text-light); }

.sp-view-toggle {
  display: inline-flex; padding: 3px; gap: 2px;
  background: white; border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  height: 40px; align-items: center;
}
.sp-view-btn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--c-text-medium);
  border: none; border-radius: var(--radius-xs2); cursor: pointer;
}
.sp-view-btn.active { background: var(--c-nav-search-bg); color: var(--c-text); }

/* --------- Tabs --------- */
.sp-tabs {
  display: flex;
  gap: var(--space-md);
  border-bottom: 1px solid var(--c-border);
}
.sp-tab {
  position: relative;
  padding: var(--space-xs) 0;
  border: none;
  background: transparent;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: 16px;
  letter-spacing: 0.1px;
  cursor: pointer;
}
.sp-tab:hover { color: var(--c-text); }
.sp-tab.active { color: var(--c-text); font-weight: 500; }
.sp-tab.active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -1px;
  height: 2px; background: var(--c-accent-primary);
}

/* --------- Table shell --------- */
.sp-table-wrap {
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.sp-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
  min-width: 1220px;
}
.sp-table thead th {
  padding: 14px 14px;
  text-align: left;
  font-weight: 500;
  color: var(--c-text-medium);
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
  font-size: var(--font-3xs);
}
.sp-col-product { width: 260px; }
.sp-col-actions { width: 130px; }

.sp-table tbody td {
  padding: 14px;
  border-bottom: 1px solid var(--c-border-card);
  vertical-align: middle;
}
.sp-row { cursor: default; transition: background 0.15s; }
.sp-row--expandable { cursor: pointer; }
.sp-row:hover { background: color-mix(in srgb, var(--c-brand-blue) 4%, white); }
.sp-row--expanded {
  background: color-mix(in srgb, var(--c-brand-blue) 6%, white);
}
.sp-row--expanded td { border-bottom-color: transparent; }

/* --------- Product cell --------- */
.sp-cell-product {
  display: flex;
  align-items: center;
  gap: var(--space-a8);
  min-width: 240px;
}
.sp-expand-slot {
  width: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sp-expand-btn {
  width: 20px; height: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none;
  color: var(--c-text-medium);
  cursor: pointer;
  border-radius: var(--radius-xs2);
  transition: transform 0.25s ease, background 0.12s, color 0.12s;
}
.sp-expand-btn:hover { background: rgba(0,0,0,0.05); color: var(--c-text); }
.sp-expand-btn--open { transform: rotate(-180deg); color: var(--c-brand-blue); }

.sp-code-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sp-kind { color: var(--c-text-medium); font-size: var(--font-3xs); line-height: 14px; }
.sp-code {
  color: var(--c-text);
  font-weight: 500;
  font-size: var(--font-2xs);
  word-break: break-word;
  text-decoration: none;
}
.sp-code--link { cursor: pointer; transition: color 0.12s; }
.sp-code--link:hover { color: var(--c-brand-blue); text-decoration: underline; }

.sp-thumb-link {
  display: inline-flex;
  border-radius: var(--radius-xs);
  transition: box-shadow 0.15s, transform 0.15s;
  text-decoration: none;
}
.sp-thumb-link:hover {
  box-shadow: 0 0 0 2px var(--c-brand-blue);
  transform: translateY(-1px);
}
.sp-replacement {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--c-brand-blue);
  font-size: var(--font-3xs);
  margin-top: 2px;
}

/* --------- Description & Spec --------- */
.sp-cell-desc { color: var(--c-text); font-size: var(--font-2xs); }
.sp-spec {
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 16px;
  font-size: var(--font-3xs);
  line-height: 15px;
}
.sp-spec ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; }
.sp-spec ul:first-child li { color: var(--c-text-medium); }
.sp-spec ul:last-child  li { color: var(--c-text); }

/* --------- Dimension --------- */
.sp-dim { display: inline-flex; flex-direction: column; gap: 2px; }
.sp-dim-label { color: var(--c-text-medium); font-size: var(--font-3xs); }
.sp-dim-value { color: var(--c-text); font-weight: 500; font-size: var(--font-2xs); }

/* --------- Availability badges --------- */
.sp-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--font-3xs);
  font-weight: 500;
  line-height: 14px;
  letter-spacing: 0.1px;
  white-space: nowrap;
}
.sp-badge--in-stock            { background: color-mix(in srgb, #2E7D4F 15%, white); color: #2E7D4F; }
.sp-badge--out-of-stock        { background: color-mix(in srgb, #B33A3A 15%, white); color: #B33A3A; }
.sp-badge--not-available       { background: var(--c-surface-alt); color: var(--c-text-medium); }
.sp-badge--no-longer-available { background: color-mix(in srgb, var(--c-text-medium) 20%, white); color: var(--c-text-medium); }

/* --------- Price cell + pricing popover --------- */
.sp-price-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
.sp-price-was-line { display: inline-flex; align-items: center; gap: 6px; }
.sp-price { color: var(--c-text); font-weight: 500; font-size: var(--font-xs); }
.sp-price-was {
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
  text-decoration: line-through;
}
.sp-price-savings {
  display: inline-block;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, #B33A3A 12%, white);
  color: #B33A3A;
  font-size: var(--font-3xs);
  font-weight: 500;
  line-height: 14px;
}
.sp-info-btn {
  position: relative;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 0; border: none;
  background: transparent;
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
  font-family: var(--font-ui);
  cursor: pointer;
}
.sp-info-btn:hover { color: var(--c-brand-blue); }
.sp-pricing-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: -12px;
  min-width: 240px;
  padding: 12px 14px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 10;
  text-align: left;
  cursor: default;
}
.sp-pricing-popover::after {
  content: '';
  position: absolute;
  top: 100%; left: 20px;
  border: 6px solid transparent;
  border-top-color: white;
  filter: drop-shadow(0 1px 0 var(--c-border));
}
.sp-pricing-title {
  font-family: var(--font-headline);
  font-size: var(--font-xs);
  color: var(--c-text);
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--c-border-card);
}
.sp-pricing-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 3px 0;
  font-size: var(--font-3xs);
  color: var(--c-text);
}
.sp-pricing-row span:first-child { color: var(--c-text-medium); }
.sp-pricing-row--total {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--c-border-card);
  font-weight: 500;
}
.sp-pricing-row--total span:first-child { color: var(--c-text); }
.pop-enter-active, .pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.pop-enter-from,   .pop-leave-to     { opacity: 0; transform: translateY(4px); }

/* --------- Actions + quantity control --------- */
.sp-cell-actions { display: flex; gap: 6px; align-items: center; }
.sp-action-btn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s, filter 0.12s;
}
.sp-action-btn:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }
.sp-action-btn--primary {
  background: var(--c-brand-blue);
  border-color: var(--c-brand-blue);
  color: var(--c-text-inverted);
}
.sp-action-btn--primary:hover { filter: brightness(1.05); color: white; }
.sp-action-btn--ghost { border-color: transparent; color: var(--c-text-medium); }
.sp-action-btn--ghost:hover { background: rgba(0,0,0,0.04); color: var(--c-text); border-color: transparent; }

.sp-qty-btn {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.sp-qty-btn:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }
.sp-qty-value {
  min-width: 22px;
  text-align: center;
  font-weight: 500;
  font-size: var(--font-2xs);
}

/* --------- Accordion (smooth expand via grid-template-rows trick) --------- */
.sp-acc-tr td { padding: 0; border-bottom: 1px solid var(--c-border-card); }
.sp-acc-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  background: color-mix(in srgb, var(--c-brand-blue) 6%, white);
}
.sp-acc-wrap--open { grid-template-rows: 1fr; }
.sp-acc-inner {
  min-height: 0;
  overflow: hidden;
}
.sp-acc-section { padding: 14px 18px 18px; }
.sp-acc-section + .sp-acc-section { border-top: 1px solid var(--c-border-card); }
.sp-acc-heads,
.sp-acc-row {
  display: grid;
  grid-template-columns: minmax(200px, 1.4fr) minmax(140px, 1.4fr) 140px 140px 160px 130px;
  gap: 14px;
  align-items: center;
}
.sp-acc-heads {
  padding: 6px 4px 10px;
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
  border-bottom: 1px solid var(--c-border-card);
}
.sp-acc-row {
  padding: 12px 4px;
  border-bottom: 1px solid var(--c-border-card);
}
.sp-acc-row:last-child { border-bottom: none; }
.sp-acc-product { display: inline-flex; align-items: center; gap: var(--space-a8); }
.sp-acc-desc    { color: var(--c-text); font-size: var(--font-2xs); }
.sp-acc-mid,
.sp-acc-actions { display: inline-flex; gap: 6px; align-items: center; }
.sp-acc-price   { display: flex; flex-direction: column; gap: 3px; }
.sp-acc-qty     { font-weight: 500; }

.empty { text-align: center; color: var(--c-text-medium); padding: var(--space-md); }

/* --------- Pagination + disclaimer --------- */
.pagination {
  display: flex; justify-content: center; gap: 6px;
  padding: var(--space-xs) 0;
}
.page-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.page-btn:hover:not(:disabled) { background: var(--c-nav-search-bg); color: var(--c-text); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn--num { border-color: var(--c-border-card); }
.page-btn.active { background: var(--c-brand-blue); color: var(--c-text-inverted); border-color: var(--c-brand-blue); }

.sp-disclaimer {
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--c-border-card);
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  line-height: 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.sp-disclaimer svg { flex-shrink: 0; color: var(--c-text-medium); margin-top: 1px; }

/* --------- Responsive polish --------- */
@media (max-width: 1100px) {
  .sp-table { min-width: 900px; }
}
</style>
