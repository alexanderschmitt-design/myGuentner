<script setup lang="ts">
/**
 * Home page — single tab bar with up to 5 sections.
 *   1. Units (default)
 *   2. Bare Coils
 *   3. By Category (myGPS)
 *   4. By Application
 *   5. API & MCP Services
 *
 * Each section is toggle-able via /admin (localStorage flag) and drops
 * out of the tab bar when hidden. If the currently active section
 * becomes hidden, we fall back to the first still-visible tab.
 */

useHead({ title: 'myGPC — Home' })

const { visibility } = useSectionVisibility()

type TabId = 'unit' | 'coil' | 'mygps' | 'application' | 'api-services'

const activeTab = useHomeTab()

const visibleTabs = computed<TabId[]>(() => {
  const v = visibility.value
  const t: TabId[] = []
  if (v.units)          t.push('unit')
  if (v.coils)          t.push('coil')
  if (v.application)    t.push('application')
  if (v['api-services']) t.push('api-services')
  if (v.mygps)          t.push('mygps')
  return t
})

// If the current tab was hidden by admin, jump to the first visible one.
watchEffect(() => {
  const list = visibleTabs.value
  if (list.length > 0 && !list.includes(activeTab.value)) {
    activeTab.value = list[0]
  }
})

const router = useRouter()
const store = useConfigStore()

// Direct navigation into Step 2 (Thermodynamics) with the numeric category ID
// in the URL. Matches the pattern from reference screenshots:
//   /mygpc/0/thermodynamics  → Evaporator DX
//   /mygpc/1/thermodynamics  → Evaporator Pump
//   … see composables/useCategory.ts for full ID map.
//
// productSection is set BEFORE navigation:
//   1 = Unit  (Units + By Category + By Application accordions)
//   2 = Coil  (Bare Coils accordion) — drives TopStepNav to show
//              "Coil Geometry" as step 3 instead of "Unit Selection"
function goToWizard(catId: number, categorySlug: string, productSection: 1 | 2 = 1) {
  store.setProductSection(productSection)
  store.currentCategory = categorySlug
  store.currentSubcategory = null
  router.push(`/mygpc/${catId}/thermodynamics`)
}

// UNITS (productSection=1) — id maps to GPC.EU productCategory
const UNITS = [
  { catId: 0,  title: 'Evaporator', sublabel: 'DX',      image: '/images/Evaporator-dx.png',   icon: '/icons/icon_evaporator_dx.svg',   slug: 'evaporator-dx' },
  { catId: 1,  title: 'Evaporator', sublabel: 'Pump',    image: '/images/Evaporator-Pump.png', icon: '/icons/icon_evaporator_pump.svg', slug: 'evaporator-pump' },
  { catId: 2,  title: 'Air cooler', sublabel: 'Coolant', image: '/images/Aircooler.png',       icon: '/icons/icon_aircooler.svg',       slug: 'air-cooler' },
  { catId: 4,  title: 'Dry cooler', sublabel: '',        image: '/images/Drycooler.png',       icon: '/icons/icon_drycooler.svg',       slug: 'dry-cooler', extra: [{ label: 'Oil Cooler', catId: 6,  slug: 'oil-cooler' }] },
  { catId: 3,  title: 'Condenser',  sublabel: '',        image: '/images/Condenser.png',       icon: '/icons/icon_condenser.svg',       slug: 'condenser',  extra: [{ label: 'Subcooler',  catId: 5,  slug: 'subcooler'  }] },
  { catId: 10, title: 'Gas cooler', sublabel: 'CO₂',     image: '/images/Gas-Cooler.png',      icon: '/icons/icon_gascooler.svg',       slug: 'gas-cooler' }
]

// MYGPS category products (from pre-migration mygps-projects.html links)
const MYGPS_CATS = [
  { slug: 'evaporative',   title: 'Evaporative Products', image: '/images/Evaporator-Pump.png', icon: '/icons/icon-pump.svg', options: ['Evaporative Condenser', 'Evaporative Fluid Coolers'] },
  { slug: 'adiabatic',     title: 'Adiabatic Products',   image: '/images/Condenser.png',       icon: '/icons/icon-condenser.svg', options: ['Adiabatic Condensers', 'Adiabatic Fluid Coolers', 'Adiabatic CO₂ Gas Coolers'] },
  { slug: 'high-density',  title: 'High-Density Products', image: '/images/Gas-Cooler.png',     icon: '/icons/icon-gascooler.svg', options: ['Adiabatic Fluid Coolers', 'Adiabatic Condensers'] },
  { slug: 'dry',           title: 'Dry Products',         image: '/images/Drycooler.png',       icon: '/icons/icon-dry.svg', options: ['Dry Condensers'] },
  { slug: 'air-cooler',    title: 'Air Cooler Products',  image: '/images/Aircooler.png',       icon: '/icons/icon-aircooler.svg', options: ['Air Cooler'] },
  { slug: 'data-center',   title: 'Data Center',          image: '/images/Datacenter.jpg',      icon: null, options: ['Data Center'] }
]

// APPLICATION cards
const APPLICATIONS = [
  { slug: 'food-retail',    title: 'Food Retail',            image: '/images/Food-Retail.png', cta: 'DX' },
  { slug: 'food',           title: 'Food Processing',        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=300&fit=crop', cta: 'Pump' },
  { slug: 'industrial',     title: 'Industrial Refrigeration', image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=300&fit=crop', cta: 'Coolant' }
]

// BARE COILS (productSection=2)
const COILS = [
  { slug: 'coil-evaporator-dx',   title: 'Evaporator', sublabel: 'DX',     image: '/images/coil-evaporator-dx.png',   icon: '/icons/icon_evaporator_dx.svg' },
  { slug: 'coil-evaporator-pump', title: 'Evaporator', sublabel: 'Pump',   image: '/images/coil-evaporator-pump.png', icon: '/icons/icon_evaporator_pump.svg' },
  { slug: 'coil-air-cooler',      title: 'Air cooler', sublabel: 'Coolant', image: '/images/coil-air-cooler.png',    icon: '/icons/icon_aircooler.svg' },
  { slug: 'coil-dry-cooler',      title: 'Dry cooler', sublabel: '',       image: '/images/coil-dry-cooler.png',      icon: '/icons/icon_drycooler.svg', extra: [{ label: 'Oil Cooler', slug: 'coil-oil-cooler' }] },
  { slug: 'coil-condenser',       title: 'Condenser',  sublabel: '',       image: '/images/coil-condenser.png',       icon: '/icons/icon_condenser.svg' },
  { slug: 'coil-subcooler',       title: 'Sub Cooler', sublabel: '',       image: '/images/coil-subcooler.png',       icon: '/icons/icon-sub.svg' }
]
</script>

<template>
  <div class="home">
    <section v-if="visibleTabs.length" class="tab-container">
      <!-- Single tab bar covering all 5 sections. Each button drops out
           automatically when the admin hides its section. -->
      <nav class="tab-nav" role="tablist" aria-label="Home sections">
        <button
          v-if="visibility.units"
          role="tab"
          :aria-selected="activeTab === 'unit'"
          class="tab-btn"
          :class="{ active: activeTab === 'unit' }"
          @click="activeTab = 'unit'"
        >UNIT</button>
        <button
          v-if="visibility.coils"
          role="tab"
          :aria-selected="activeTab === 'coil'"
          class="tab-btn"
          :class="{ active: activeTab === 'coil' }"
          @click="activeTab = 'coil'"
        >BARE COIL</button>
        <button
          v-if="visibility.application"
          role="tab"
          :aria-selected="activeTab === 'application'"
          class="tab-btn"
          :class="{ active: activeTab === 'application' }"
          @click="activeTab = 'application'"
        >BY APPLICATION</button>
        <button
          v-if="visibility['api-services']"
          role="tab"
          :aria-selected="activeTab === 'api-services'"
          class="tab-btn"
          :class="{ active: activeTab === 'api-services' }"
          @click="activeTab = 'api-services'"
        >API &amp; MCP SERVICES</button>
        <button
          v-if="visibility.mygps"
          role="tab"
          :aria-selected="activeTab === 'mygps'"
          class="tab-btn"
          :class="{ active: activeTab === 'mygps' }"
          @click="activeTab = 'mygps'"
        >myGPS</button>
      </nav>

      <!-- UNIT -->
      <div v-if="activeTab === 'unit' && visibility.units" role="tabpanel" class="tab-panel">
        <div class="cat-grid" data-learn-id="home-unit-grid" data-field-name="Produktkategorie (Unit)" data-api-param="productCategory">
          <ProductCategoryCard
            v-for="u in UNITS"
            :key="u.slug"
            :image="u.image"
            :icon="u.icon"
            :title="u.title"
            :cta-label="u.sublabel || u.title"
            :on-cta="() => goToWizard(u.catId, u.slug)"
            :extras="(u.extra || []).map(e => ({ label: e.label, onClick: () => goToWizard(e.catId, e.slug) }))"
            last-config="GACC CX 040.2/2WN/DJA4A.UNNN"
          />
        </div>
        <div class="upload-section">
          <button class="btn btn-outline">
            Upload Desktop GPC calculation
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
        </div>
      </div>

      <!-- BARE COIL -->
      <div v-else-if="activeTab === 'coil' && visibility.coils" role="tabpanel" class="tab-panel">
        <div class="cat-grid">
          <ProductCategoryCard
            v-for="c in COILS"
            :key="c.slug"
            :image="c.image"
            :icon="c.icon"
            :title="c.title"
            :cta-label="c.sublabel || c.title"
            :on-cta="() => goToWizard(0, c.slug, 2)"
            :extras="(c.extra || []).map(e => ({ label: e.label, onClick: () => goToWizard(0, e.slug, 2) }))"
            last-config="GACC CX 040.2/2WN/DJA4A.UNNN"
          />
        </div>
        <div class="upload-section">
          <button class="btn btn-outline">
            Upload Desktop GPC calculation
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
        </div>
      </div>

      <!-- BY CATEGORY (myGPS) -->
      <div v-else-if="activeTab === 'mygps' && visibility.mygps" role="tabpanel" class="tab-panel">
        <div class="cat-grid">
          <ProductCategoryCard
            v-for="c in MYGPS_CATS"
            :key="c.slug"
            :image="c.image"
            :icon="c.icon"
            :title="c.title"
            :cta-label="c.options[0]"
            :on-cta="() => goToWizard(0, c.slug)"
            :extras="c.options.slice(1).map((opt: string) => ({ label: opt, onClick: () => goToWizard(0, c.slug) }))"
          />
        </div>
      </div>

      <!-- BY APPLICATION -->
      <div v-else-if="activeTab === 'application' && visibility.application" role="tabpanel" class="tab-panel">
        <div class="cat-grid">
          <ProductCategoryCard
            v-for="a in APPLICATIONS"
            :key="a.slug"
            :image="a.image"
            :title="a.title"
            :cta-label="a.cta"
            :on-cta="() => goToWizard(0, a.slug)"
            last-config="DCHD 213.1 1x5/08RA-1500L/02P.M"
          />
        </div>
      </div>

      <!-- API & MCP SERVICES -->
      <div v-else-if="activeTab === 'api-services' && visibility['api-services']" role="tabpanel" class="tab-panel">
        <div class="api-grid">
          <article class="api-card">
            <div class="api-icon api-icon--api">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <h3>myGPC API</h3>
            <div class="api-tag">Enterprise Integration</div>
            <p>Direct integration of Güntner's calculation logic into your ERP or CRM software. Automate quotation processes and always work with up-to-date product data.</p>
            <div class="api-actions">
              <button class="btn btn-primary">Request Access</button>
              <button class="btn btn-outline">Learn More</button>
            </div>
          </article>
          <article class="api-card">
            <div class="api-icon api-icon--mcp">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="7" rx="1.5"/>
                <rect x="3" y="14" width="18" height="7" rx="1.5"/>
              </svg>
            </div>
            <h3>MCP Server</h3>
            <div class="api-tag">Future-Proof Data Management</div>
            <p>Future-proof server solution for centralized configuration and data management. Scalable infrastructure for complex engineering workflows and teams.</p>
            <div class="api-actions">
              <button class="btn btn-primary">Request Access</button>
              <button class="btn btn-outline">Learn More</button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <div v-else class="empty-state">
      All sections are hidden. Visit <NuxtLink to="/admin">Admin</NuxtLink> to enable at least one section.
    </div>
  </div>
</template>

<style scoped>
.home { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

/* Tab widget — UNIT / BARE COIL primary selector. Container has no
   card border (only the panel below carries the surface), so the
   tabs read as navigation rather than a boxed header. */
.tab-container {
  display: flex;
  flex-direction: column;
}
.tab-nav {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--c-border);
  margin-bottom: var(--space-5);
}
.tab-btn {
  position: relative;
  padding: var(--space-3) var(--space-2);
  background: transparent;
  border: none;
  font-family: var(--font-ui);
  font-size: var(--font-md, 18px);
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--c-text-light);
  cursor: pointer;
  transition: color 0.15s;
}
.tab-btn:hover:not(.active) { color: var(--c-text); }
.tab-btn.active { color: var(--c-brand-blue); }
.tab-btn.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  background: #39EDB5;
  border-radius: 2px;
}
.tab-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 25%, transparent);
  border-radius: 4px;
}
.tab-panel {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
}

/* Tab bar can grow beyond viewport on narrow screens with 5 tabs;
   allow a horizontal scroll fallback rather than wrapping. */
.tab-nav { flex-wrap: wrap; }

.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);                        /* 24 */
  padding-top: var(--space-5);
}
@media (max-width: 900px) { .cat-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .cat-grid { grid-template-columns: 1fr; } }

.cat-card, .industry-card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: 0.15s;
  display: flex;
  flex-direction: column;
}
.cat-card:hover, .industry-card:hover {
  border-color: var(--c-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 56, 101, 0.06);
}
.cat-card-image, .industry-card-img {
  aspect-ratio: 3 / 2;
  background: var(--c-surface-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cat-card-image img, .industry-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cat-card-body, .industry-card-body {
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.cat-card-title, .industry-card-body h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--c-text);
  font-size: 1rem;
  margin: 0;
}
.industry-card-body h3 { color: var(--c-primary); }
.cat-card-icon { width: 22px; height: 22px; }
.cat-card-btn {
  display: block;
  padding: 10px 16px;
  background: var(--c-brand-blue);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: center;
  transition: filter 0.15s;
}
.cat-card-btn:hover { filter: brightness(1.08); }

.upload-section { margin-top: 24px; }

.api-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding-top: 20px;
}
@media (max-width: 800px) { .api-grid { grid-template-columns: 1fr; } }
.api-card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.api-icon {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.api-icon--api { background: color-mix(in srgb, var(--c-success) 15%, white); color: var(--c-success); }
.api-icon--mcp { background: color-mix(in srgb, var(--c-primary) 15%, white); color: var(--c-primary); }
.api-card h3 { margin: 4px 0 0; font-size: 1.15rem; }
.api-tag {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-primary);
}
.api-card p { margin: 8px 0; color: var(--c-text-muted); line-height: 1.55; font-size: 0.9rem; }
.api-actions { margin-top: auto; display: flex; gap: 10px; flex-wrap: wrap; padding-top: 12px; }

.empty-state {
  padding: 40px 20px;
  background: white;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius);
  text-align: center;
  color: var(--c-text-muted);
}
</style>
