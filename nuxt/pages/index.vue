<script setup lang="ts">
/**
 * Home page — 5-accordion layout restored from pre-migration frontend/index.html
 *   1. Units             (default open)
 *   2. By Category (myGPS)
 *   3. By Application
 *   4. Bare Coils
 *   5. API & MCP Services
 *
 * Each section is toggle-able via /admin (localStorage flag).
 * Default open/closed state per-accordion is also localStorage-persisted.
 */

useHead({ title: 'myGPC — Home' })

const { visibility } = useSectionVisibility()

// Accordion open-state (independent from admin visibility)
const openSections = ref<Record<string, boolean>>({
  units: true,
  mygps: true,
  application: false,
  coils: false,
  'api-services': false
})
function toggleOpen(id: string) {
  openSections.value[id] = !openSections.value[id]
}

const router = useRouter()
const store = useConfigStore()

function goToWizard(productSection: 1 | 2, categorySlug: string) {
  store.currentCategory = categorySlug
  store.currentSubcategory = null
  router.push('/mygps')
}

// UNITS (productSection=1)
const UNITS = [
  { slug: 'evaporator-dx',    title: 'Evaporator', sublabel: 'DX',     image: '/images/Evaporator-dx.png',    icon: '/icons/icon-dx.svg' },
  { slug: 'evaporator-pump',  title: 'Evaporator', sublabel: 'Pump',   image: '/images/Evaporator-Pump.png',  icon: '/icons/icon-pump.svg' },
  { slug: 'air-cooler',       title: 'Air cooler', sublabel: 'Coolant', image: '/images/Aircooler.png',       icon: '/icons/icon-coolant.svg' },
  { slug: 'dry-cooler',       title: 'Dry cooler', sublabel: '',       image: '/images/Drycooler.png',        icon: '/icons/icon-dry.svg', extra: [{ label: 'Oil Cooler', slug: 'oil-cooler' }] },
  { slug: 'condenser',        title: 'Condenser',  sublabel: '',       image: '/images/Condenser.png',        icon: '/icons/icon-condenser.svg', extra: [{ label: 'Subcooler', slug: 'subcooler' }] },
  { slug: 'gas-cooler',       title: 'Gas cooler', sublabel: 'CO₂',    image: '/images/Gas-Cooler.png',       icon: '/icons/icon-gascooler.svg' }
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
  { slug: 'data-centers',   title: 'Data Centers',           image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=300&fit=crop', cta: 'DC' },
  { slug: 'food',           title: 'Food Processing',        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=300&fit=crop', cta: 'Pump' },
  { slug: 'industrial',     title: 'Industrial Refrigeration', image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=300&fit=crop', cta: 'Coolant' }
]

// BARE COILS (productSection=2)
const COILS = [
  { slug: 'coil-evaporator-dx',   title: 'Evaporator', sublabel: 'DX',     image: '/images/coil-evaporator-dx.png',   icon: '/icons/icon-dx.svg' },
  { slug: 'coil-evaporator-pump', title: 'Evaporator', sublabel: 'Pump',   image: '/images/coil-evaporator-pump.png', icon: '/icons/icon-pump.svg' },
  { slug: 'coil-air-cooler',      title: 'Air cooler', sublabel: 'Coolant', image: '/images/coil-air-cooler.png',    icon: '/icons/icon-coolant.svg' },
  { slug: 'coil-dry-cooler',      title: 'Dry cooler', sublabel: '',       image: '/images/coil-dry-cooler.png',      icon: '/icons/icon-dry.svg', extra: [{ label: 'Oil Cooler', slug: 'coil-oil-cooler' }] },
  { slug: 'coil-condenser',       title: 'Condenser',  sublabel: '',       image: '/images/coil-condenser.png',       icon: '/icons/icon-condenser.svg' },
  { slug: 'coil-subcooler',       title: 'Sub Cooler', sublabel: '',       image: '/images/coil-subcooler.png',       icon: '/icons/icon-sub.svg' }
]
</script>

<template>
  <div class="home">
    <!-- 1. UNITS -->
    <section v-if="visibility.units" class="accordion" :class="{ 'is-open': openSections.units }">
      <button class="accordion-head" @click="toggleOpen('units')">
        <h2>Units</h2>
        <svg class="chev" viewBox="0 0 24 24" width="20" height="20"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>
      </button>
      <div v-if="openSections.units" class="accordion-body">
        <div class="cat-grid">
          <div v-for="u in UNITS" :key="u.slug" class="cat-card">
            <div class="cat-card-image">
              <img :src="u.image" :alt="u.title" />
            </div>
            <div class="cat-card-body">
              <div class="cat-card-title">
                <img v-if="u.icon" :src="u.icon" alt="" class="cat-card-icon" />
                <span>{{ u.title }}</span>
              </div>
              <button class="cat-card-btn" @click="goToWizard(1, u.slug)">
                {{ u.sublabel || u.title }}
              </button>
              <button v-for="e in u.extra" :key="e.slug" class="cat-card-btn" @click="goToWizard(1, e.slug)">
                {{ e.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="upload-section">
          <button class="btn btn-outline">
            Upload Desktop GPC calculation
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- 2. BY CATEGORY (myGPS) -->
    <section v-if="visibility.mygps" class="accordion" :class="{ 'is-open': openSections.mygps }">
      <button class="accordion-head" @click="toggleOpen('mygps')">
        <h2>By Category (myGPS)</h2>
        <svg class="chev" viewBox="0 0 24 24" width="20" height="20"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>
      </button>
      <div v-if="openSections.mygps" class="accordion-body">
        <div class="cat-grid">
          <div v-for="c in MYGPS_CATS" :key="c.slug" class="cat-card">
            <div class="cat-card-image"><img :src="c.image" :alt="c.title" /></div>
            <div class="cat-card-body">
              <div class="cat-card-title">
                <img v-if="c.icon" :src="c.icon" alt="" class="cat-card-icon" />
                <span>{{ c.title }}</span>
              </div>
              <button v-for="(opt, i) in c.options" :key="i" class="cat-card-btn" @click="goToWizard(1, c.slug)">
                {{ opt }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. BY APPLICATION -->
    <section v-if="visibility.application" class="accordion" :class="{ 'is-open': openSections.application }">
      <button class="accordion-head" @click="toggleOpen('application')">
        <h2>By Application</h2>
        <svg class="chev" viewBox="0 0 24 24" width="20" height="20"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>
      </button>
      <div v-if="openSections.application" class="accordion-body">
        <div class="industry-grid">
          <div v-for="a in APPLICATIONS" :key="a.slug" class="industry-card">
            <div class="industry-card-img"><img :src="a.image" :alt="a.title" /></div>
            <div class="industry-card-body">
              <h3>{{ a.title }}</h3>
              <button class="cat-card-btn" @click="goToWizard(1, a.slug)">{{ a.cta }}</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. BARE COILS -->
    <section v-if="visibility.coils" class="accordion" :class="{ 'is-open': openSections.coils }">
      <button class="accordion-head" @click="toggleOpen('coils')">
        <h2>Bare Coils</h2>
        <svg class="chev" viewBox="0 0 24 24" width="20" height="20"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>
      </button>
      <div v-if="openSections.coils" class="accordion-body">
        <div class="cat-grid">
          <div v-for="c in COILS" :key="c.slug" class="cat-card">
            <div class="cat-card-image"><img :src="c.image" :alt="c.title" /></div>
            <div class="cat-card-body">
              <div class="cat-card-title">
                <img v-if="c.icon" :src="c.icon" alt="" class="cat-card-icon" />
                <span>{{ c.title }}</span>
              </div>
              <button class="cat-card-btn" @click="goToWizard(2, c.slug)">
                {{ c.sublabel || c.title }}
              </button>
              <button v-for="e in c.extra" :key="e.slug" class="cat-card-btn" @click="goToWizard(2, e.slug)">
                {{ e.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. API & MCP SERVICES -->
    <section v-if="visibility['api-services']" class="accordion" :class="{ 'is-open': openSections['api-services'] }">
      <button class="accordion-head" @click="toggleOpen('api-services')">
        <h2>API &amp; MCP Services</h2>
        <svg class="chev" viewBox="0 0 24 24" width="20" height="20"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>
      </button>
      <div v-if="openSections['api-services']" class="accordion-body">
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

    <div v-if="!Object.values(visibility).some(v => v)" class="empty-state">
      All sections are hidden. Visit <NuxtLink to="/admin">Admin</NuxtLink> to enable at least one section.
    </div>
  </div>
</template>

<style scoped>
.home { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

.accordion {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}
.accordion-head {
  width: 100%;
  background: none;
  border: none;
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: var(--c-text);
}
.accordion-head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--c-primary);
  letter-spacing: 0.02em;
}
.chev { color: var(--c-text-muted); transition: transform 0.2s; }
.accordion.is-open .chev { transform: rotate(180deg); }
.accordion-body {
  padding: 0 24px 24px;
  border-top: 1px solid var(--c-border);
}

.cat-grid, .industry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding-top: 20px;
}
@media (max-width: 900px) { .cat-grid, .industry-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .cat-grid, .industry-grid { grid-template-columns: 1fr; } }

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
