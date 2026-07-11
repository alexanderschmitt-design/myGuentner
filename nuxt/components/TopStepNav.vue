<script setup lang="ts">
/**
 * 5-Schritt Marketing-Navigation (aus Layout-PNGs). Zeigt Category →
 * Thermodynamics → Unit Selection → Results → Datasheet, jeweils mit
 * Status-Dot und connecting line. Aktuelle Route bestimmt den active-Step;
 * mapping von Internal-Wizard-Steps auf Marketing-Steps via routeToStep().
 */

interface Step { id: string; label: string; route: string }

const STEPS: Step[] = [
  { id: 'category',    label: 'Category',       route: '/mygps' },
  { id: 'thermo',      label: 'Thermodynamics', route: '/mygps/inputs' },
  { id: 'unit',        label: 'Unit Selection', route: '/mygps/unit' },
  { id: 'results',     label: 'Results',        route: '/mygps/output' },
  { id: 'datasheet',   label: 'Datasheet',      route: '/mygps/datasheet' }
]

// Internal wizard sub-routes → marketing step
const ROUTE_TO_STEP: Record<string, string> = {
  '/mygps':              'category',
  '/mygps/projects':     'category',
  '/mygps/inputs':       'thermo',
  '/mygps/unit':         'unit',
  '/mygps/accessories':  'unit',
  '/mygps/service':      'unit',
  '/mygps/output':       'results',
  '/mygps/annual':       'results',
  '/mygps/datasheet':    'datasheet'
}

const route = useRoute()

const currentStep = computed(() => ROUTE_TO_STEP[route.path] || 'category')
const currentIndex = computed(() => STEPS.findIndex(s => s.id === currentStep.value))

function statusFor(i: number): 'done' | 'current' | 'pending' {
  if (i < currentIndex.value) return 'done'
  if (i === currentIndex.value) return 'current'
  return 'pending'
}
</script>

<template>
  <nav class="top-step-nav" aria-label="Wizard steps">
    <ol>
      <li v-for="(s, i) in STEPS" :key="s.id" :class="statusFor(i)">
        <NuxtLink :to="s.route" class="step">
          <span class="dot" aria-hidden="true">
            <svg v-if="statusFor(i) === 'done'" viewBox="0 0 16 16" width="10" height="10">
              <path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="label">{{ s.label }}</span>
        </NuxtLink>
        <span v-if="i < STEPS.length - 1" class="line" aria-hidden="true"></span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.top-step-nav {
  padding: 18px 32px 12px;
  background: var(--c-surface-muted);
  border-bottom: 1px solid var(--c-border);
}
ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}
li {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
li .step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 4px 0;
}
.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--c-border);
  background: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}
li.done .step { color: var(--c-text); }
li.done .dot { background: var(--c-primary); border-color: var(--c-primary); }
li.current .step { color: var(--c-primary); font-weight: 600; }
li.current .dot { background: var(--c-primary); border-color: var(--c-primary); }
li.pending .step { color: var(--c-text-muted); }
.line {
  flex: 1;
  height: 1px;
  background: var(--c-border);
  margin: 0 16px;
  min-width: 60px;
}
li.done + li .line,
li.done .line { background: var(--c-primary); }
@media (max-width: 900px) {
  .top-step-nav { padding: 12px 16px; overflow-x: auto; }
  .line { min-width: 24px; margin: 0 8px; }
  .label { display: none; }
  li.current .label { display: inline; }
}
</style>
