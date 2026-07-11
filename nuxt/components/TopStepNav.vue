<script setup lang="ts">
/**
 * 5-step marketing wizard nav — matches all 5 myGPC layout PNGs (2026-07-01).
 *
 * URL scheme (from reference screenshots myguntner.com/#/mygpc/<catId>/*):
 *   /                          → Category (accordions on Home)
 *   /mygpc/<catId>/thermodynamics
 *   /mygpc/<catId>/unit-selection
 *   /mygpc/<catId>/search
 *   /gpc-details               → Datasheet
 */

import { getCategoryById } from '~/composables/useCategory'

interface Step { id: string; label: string; route: (catId: number) => string }

const STEPS: Step[] = [
  { id: 'category',    label: 'Category',       route: ()          => '/' },
  { id: 'thermo',      label: 'Thermodynamics', route: (c: number) => `/mygpc/${c}/thermodynamics` },
  { id: 'unit',        label: 'Unit Selection', route: (c: number) => `/mygpc/${c}/unit-selection` },
  { id: 'results',     label: 'Results',        route: (c: number) => `/mygpc/${c}/search` },
  { id: 'datasheet',   label: 'Datasheet',      route: ()          => '/gpc-details' }
]

const route = useRoute()

// Extract catId from URL: /mygpc/<N>/... → N. Else 0 (default Evaporator DX).
const catId = computed<number>(() => {
  const m = route.path.match(/^\/mygpc\/(\d+)\//)
  return m ? parseInt(m[1], 10) : 0
})

// Determine current step from route path
const currentStep = computed<string>(() => {
  if (route.path === '/' || route.path.startsWith('/mygpc') && route.path.split('/').length <= 3) return 'category'
  if (route.path.endsWith('/thermodynamics')) return 'thermo'
  if (route.path.endsWith('/unit-selection')) return 'unit'
  if (route.path.endsWith('/search')) return 'results'
  if (route.path === '/gpc-details') return 'datasheet'
  return 'category'
})
const currentIndex = computed(() => STEPS.findIndex(s => s.id === currentStep.value))

function statusFor(i: number): 'done' | 'current' | 'pending' {
  if (i < currentIndex.value) return 'done'
  if (i === currentIndex.value) return 'current'
  return 'pending'
}
function lineDone(i: number): boolean { return i < currentIndex.value }
</script>

<template>
  <nav class="top-step-nav" aria-label="Wizard steps">
    <ol>
      <template v-for="(s, i) in STEPS" :key="s.id">
        <li :class="statusFor(i)">
          <NuxtLink :to="s.route(catId)" class="step">
            <span class="dot" aria-hidden="true">
              <svg v-if="statusFor(i) === 'done'" viewBox="0 0 16 16" width="10" height="10">
                <path d="M3.5 8.5l3 3 6-7" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="label">{{ s.label }}</span>
          </NuxtLink>
        </li>
        <span v-if="i < STEPS.length - 1" class="line" :class="{ done: lineDone(i) }" aria-hidden="true"></span>
      </template>
    </ol>
  </nav>
</template>

<style scoped>
.top-step-nav {
  padding: 20px 32px 16px;
  background: var(--c-surface-muted);
  border-bottom: 1px solid var(--c-border);
}
ol { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; }
li { display: flex; align-items: center; flex: 0 0 auto; }
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
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--c-border);
  background: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}
li.done .step { color: var(--c-text); }
li.done .dot { background: var(--c-brand-blue); border-color: var(--c-brand-blue); }
li.current .step { color: var(--c-brand-blue); font-weight: 600; }
li.current .dot {
  background: var(--c-brand-blue);
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 20%, transparent);
}
li.pending .step { color: var(--c-text-muted); }
.line {
  flex: 1;
  height: 1px;
  background: var(--c-border);
  margin: 0 16px;
  min-width: 40px;
  transition: background 0.15s;
}
.line.done { background: var(--c-brand-blue); }
@media (max-width: 900px) {
  .top-step-nav { padding: 12px 16px; overflow-x: auto; }
  .line { min-width: 24px; margin: 0 8px; }
  .label { display: none; }
  li.current .label { display: inline; }
}
</style>
