<script setup lang="ts">
useHead({ title: 'myGPS — Options & Accessories' });

interface AccessoryGroup { id: string; label: string; options: { id: string; label: string; defaultOn?: boolean }[] }

const groups: AccessoryGroup[] = [
  { id: 'coil', label: 'Coil Construction', options: [
    { id: 'asme-u', label: 'ASME U Stamp' },
    { id: 'inlet-louvers', label: 'Inlet Louvers' }
  ] },
  { id: 'electric', label: 'Fan Motor Electrical Supply', options: [
    { id: '400-3-50', label: '400V 3-phase 50Hz', defaultOn: true },
    { id: '460-3-60', label: '460V 3-phase 60Hz' }
  ] },
  { id: 'water', label: 'Water Quality & Level Control', options: [
    { id: 'level-ctrl', label: 'Water Level Control' },
    { id: 'quality-ctrl', label: 'Water Quality Control' }
  ] },
  { id: 'pump', label: 'Pump Electrical Options', options: [
    { id: 'pump-vfd', label: 'VFD-Pump' }
  ] },
  { id: 'protection', label: 'Fan Motor Protection & Control', options: [
    { id: 'thermal-prot', label: 'Thermal protection' },
    { id: 'modbus', label: 'Modbus interface' }
  ] },
  { id: 'enclosure', label: 'Unit Electrical Protection', options: [
    { id: 'frp', label: 'FRP enclosure' },
    { id: 'ss', label: 'Stainless Steel enclosure' }
  ] }
];

const selected = ref<Record<string, boolean>>(
  Object.fromEntries(groups.flatMap(g => g.options.map(o => [o.id, !!o.defaultOn])))
);
</script>

<template>
  <section>
    <StepWizard current="accessories" />

    <h1>Options & accessories</h1>
    <p class="lede">Pick the options that apply to this configuration. These map to GPC option codes.</p>

    <div v-for="g in groups" :key="g.id" class="group">
      <h2>{{ g.label }}</h2>
      <ul>
        <li v-for="o in g.options" :key="o.id">
          <label>
            <input type="checkbox" v-model="selected[o.id]" />
            {{ o.label }}
          </label>
        </li>
      </ul>
    </div>

    <ActionBar step="accessories" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }
.group { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius); padding: var(--space-4); margin-bottom: var(--space-3); }
.group h2 { margin: 0 0 var(--space-3); font-size: 1rem; color: var(--c-accent); }
.group ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-2); }
.group label { display: flex; align-items: center; gap: var(--space-2); }
</style>
