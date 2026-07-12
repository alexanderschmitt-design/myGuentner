<script setup lang="ts">
/**
 * 5-step wizard stepper — 1:1 with Figma node 1913:1713 (stepper).
 *
 * Layout (verbatim from Figma):
 *   - Flex row, gap 5px (spacing/3xs)
 *   - Each step: 12×12px icon + text (font/2xs 14.17px, leading 16px, tracking 0.1417)
 *   - Text color: --c-text-medium (#636362) for pending/done, --c-text (#50504f) for current
 *   - Divider between steps: 1px height, min-width 12px, flex-1
 *
 * URL scheme (from reference screenshots myguntner.com/#/mygpc/<catId>/*):
 *   /                          → Category (accordions on Home)
 *   /mygpc/<catId>/thermodynamics
 *   /mygpc/<catId>/unit-selection
 *   /mygpc/<catId>/search
 *   /gpc-details               → Datasheet
 */

interface Step { id: string; label: string; route: (catId: number) => string }

const route = useRoute()
const store = useConfigStore()

const catId = computed<number>(() => {
  const m = route.path.match(/^\/mygpc\/(\d+)\//)
  return m ? parseInt(m[1], 10) : 0
})

// Step 3 label + route depends on productSection: Coil-Geometry (2) vs
// Unit-Selection (1). Reactive so both flows share this stepper.
const STEPS = computed<Step[]>(() => [
  { id: 'category', label: 'Category',       route: () => '/' },
  { id: 'thermo',   label: 'Thermodynamics', route: (c) => `/mygpc/${c}/thermodynamics` },
  store.productSection === 2
    ? { id: 'coil',   label: 'Coil Geometry',  route: (c) => `/mygpc/${c}/coil-geometry` }
    : { id: 'unit',   label: 'Unit Selection', route: (c) => `/mygpc/${c}/unit-selection` },
  { id: 'results',  label: 'Results',        route: (c) => `/mygpc/${c}/search` },
  { id: 'datasheet',label: 'Datasheet',      route: () => '/gpc-details' }
])

const currentStep = computed<string>(() => {
  if (route.path.endsWith('/thermodynamics')) return 'thermo'
  if (route.path.endsWith('/unit-selection')) return 'unit'
  if (route.path.endsWith('/coil-geometry')) return 'coil'
  if (route.path.endsWith('/search')) return 'results'
  if (route.path === '/gpc-details') return 'datasheet'
  return 'category'
})
const currentIndex = computed(() => STEPS.value.findIndex(s => s.id === currentStep.value))

function statusFor(i: number): 'done' | 'current' | 'pending' {
  if (i < currentIndex.value) return 'done'
  if (i === currentIndex.value) return 'current'
  return 'pending'
}
</script>

<template>
  <nav class="stepper" aria-label="Wizard steps">
    <template v-for="(s, i) in STEPS" :key="s.id">
      <div v-if="i > 0" class="divider" aria-hidden="true"></div>
      <NuxtLink :to="s.route(catId)" class="step" :class="statusFor(i)">

        <!-- 12×12 stepper icon per Figma spec -->
        <span class="icon" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="12" height="12">
            <template v-if="statusFor(i) === 'done'">
              <circle cx="6" cy="6" r="5.5" fill="var(--c-brand-blue)" stroke="var(--c-brand-blue)" />
              <path d="M3.5 6.2l1.7 1.7L8.5 4.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </template>
            <template v-else-if="statusFor(i) === 'current'">
              <circle cx="6" cy="6" r="5.5" fill="white" stroke="var(--c-brand-blue)" stroke-width="1.5"/>
              <circle cx="6" cy="6" r="2.5" fill="var(--c-brand-blue)"/>
            </template>
            <template v-else>
              <circle cx="6" cy="6" r="5.5" fill="white" stroke="var(--c-text-medium)" stroke-width="1"/>
            </template>
          </svg>
        </span>
        <span class="label">{{ s.label }}</span>
      </NuxtLink>
    </template>
  </nav>
</template>

<style scoped>
.stepper {
  display: flex;
  gap: var(--space-xs3);   /* 5px */
  align-items: center;
  padding: var(--space-xs) var(--space-lg);   /* 14px vert, 38px horiz */
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
}

.step {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);   /* 5px */
  text-decoration: none;
  padding: 0;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: var(--lh-2xs);
  letter-spacing: 0.1px;
  flex-shrink: 0;
}
.step.done    { color: var(--c-text-medium); }
.step.current { color: var(--c-text); font-weight: 400; }
.step.pending { color: var(--c-text-medium); }

.icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }

.divider {
  flex: 1 0 0;
  height: 1px;
  min-width: 12px;
  background: var(--c-text-medium);
  opacity: 0.4;
}

@media (max-width: 900px) {
  .stepper { padding: var(--space-xs) var(--space-xs); overflow-x: auto; }
  .divider { min-width: 12px; }
  .step .label { display: none; }
  .step.current .label { display: inline; }
}
</style>
