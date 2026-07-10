<script setup lang="ts">
/**
 * Cross-Perspective Mirror — zeigt die jeweils zwei *inaktiven* Perspektiven
 * der selben Daten an. Gemäß CLAUDE.md §6 immer sichtbar, rechte Sidebar.
 */

const store = useConfigStore();
const { formatCapacity, formatTemperature } = useUnits();
const { active, labels } = usePerspective();

const otherPerspectives = computed(() =>
  (['technical', 'application', 'location'] as const).filter(p => p !== active.value)
);

function dotStyle(p: 'technical' | 'application' | 'location') {
  const map = { technical: 'var(--c-primary)', application: 'var(--c-process)', location: 'var(--c-site)' };
  return { background: map[p] };
}

function rows(p: 'technical' | 'application' | 'location') {
  const params = store.parameters;
  if (p === 'technical') {
    return [
      { label: 't₀', value: formatTemperature(params.evaporatingTempC) },
      { label: 'tᶜ', value: formatTemperature(params.condensingTempC) },
      { label: 'Q', value: formatCapacity(params.coolingCapacityKw) },
      { label: 'Refrigerant', value: params.refrigerant ?? '—' }
    ];
  }
  if (p === 'application') {
    return [
      { label: 'Purpose', value: params.coolingPurpose ?? '—' },
      { label: 'Capacity', value: formatCapacity(params.coolingCapacityKw) },
      { label: 'Defrost', value: params.defrostMethod ?? '—' }
    ];
  }
  return [
    { label: 'Install.', value: params.installationType ?? '—' },
    { label: 'Ambient max', value: formatTemperature(params.ambientTempMaxC) },
    { label: 'Noise limit', value: params.noiseLimitDBA != null ? `${params.noiseLimitDBA} dB(A)` : '—' },
    { label: 'Environment', value: params.environmentClass }
  ];
}
</script>

<template>
  <aside class="sync-panel">
    <h3>Other perspectives</h3>
    <p class="hint">Same configuration · different lens</p>

    <section v-for="p in otherPerspectives" :key="p" class="block" :data-perspective="p">
      <header>
        <span class="dot" :style="dotStyle(p)"></span>
        <strong>{{ labels[p] }}</strong>
      </header>
      <dl>
        <template v-for="r in rows(p)" :key="r.label">
          <dt>{{ r.label }}</dt>
          <dd class="mono">{{ r.value }}</dd>
        </template>
      </dl>
    </section>
  </aside>
</template>

<style scoped>
.sync-panel { font-size: 0.875rem; position: sticky; top: var(--space-4); }
.sync-panel h3 { margin: 0; font-size: 0.875rem; color: var(--c-text); text-transform: uppercase; letter-spacing: 0.04em; }
.sync-panel .hint { color: var(--c-text-muted); margin: var(--space-1) 0 var(--space-4); font-size: 0.8rem; }
.block { margin-bottom: var(--space-4); padding-bottom: var(--space-3); border-bottom: 1px dashed var(--c-border); }
.block:last-child { border-bottom: 0; }
.block header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
dl { display: grid; grid-template-columns: auto 1fr; column-gap: var(--space-3); row-gap: 4px; margin: 0; }
dt { color: var(--c-text-muted); }
dd { margin: 0; text-align: right; }
</style>
