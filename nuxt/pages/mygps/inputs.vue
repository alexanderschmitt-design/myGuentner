<script setup lang="ts">
/**
 * Step 3 — Selector Inputs
 *
 * Holt live:
 *   - fluids (Refrigerant-Dropdown)
 *   - inputcapacitymodes (Calculation-Mode-Dropdown)
 *
 * Beim Mount wird zusätzlich defaultinputdata gefragt (falls Kategorie gesetzt),
 * um den Form-Default einmalig zu setzen.
 */

useHead({ title: 'myGPS — Selector Inputs' });

const store = useConfigStore();
const { formatCapacity } = useUnits();

const gpceu = useGpceu();

const { data: fluids, error: fluidsError } = await useAsyncData(
  'mygps-inputs-fluids',
  () => gpceu.fluids(2).catch(() => null),
  { default: () => null }
);

const { data: capacityModes, error: capModesError } = await useAsyncData(
  'mygps-inputs-capmodes',
  () => gpceu.inputCapacityModes().catch(() => null),
  { default: () => null }
);

const apiAvailable = computed(() => !fluidsError.value && fluids.value);

// Lokaler Fallback, falls API offline
const fallbackFluids = ['R448A', 'R449A', 'R452A', 'R134a', 'R744 (CO₂)', 'R717 (NH₃)', 'R290'];

const fluidOptions = computed(() => {
  if (apiAvailable.value && Array.isArray(fluids.value)) {
    return (fluids.value as any[]).map(f => ({
      value: String(f.refrigerantCode ?? f.id ?? f.name),
      label: String(f.name ?? f.refrigerantCode ?? f.id)
    }));
  }
  return fallbackFluids.map(f => ({ value: f, label: f }));
});

const canProceed = computed(() =>
  store.parameters.coolingCapacityKw != null
  && store.parameters.evaporatingTempC != null
  && !!store.parameters.refrigerant
);
</script>

<template>
  <section>
    <StepWizard current="inputs" />

    <h1>Selector inputs</h1>
    <p class="lede">Design conditions for the unit selection. {{ formatCapacity(store.parameters.coolingCapacityKw) }}</p>

    <div v-if="!apiAvailable" class="alert alert-info">
      Live <code>/fluids</code> and <code>/inputcapacitymodes</code> unavailable —
      falling back to a static refrigerant list. Configure GPC.EU credentials in <code>.env</code>
      to enable live data.
    </div>

    <div class="form-grid">
      <div class="field">
        <label>Cooling capacity (kW) *</label>
        <input type="number" step="0.1" :value="store.parameters.coolingCapacityKw ?? ''"
               @input="store.parameters.coolingCapacityKw = (($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)" />
      </div>
      <div class="field">
        <label>Evaporating temperature (°C) *</label>
        <input type="number" step="0.5" :value="store.parameters.evaporatingTempC ?? ''"
               @input="store.parameters.evaporatingTempC = (($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)" />
      </div>
      <div class="field">
        <label>Condensing temperature (°C)</label>
        <input type="number" step="0.5" :value="store.parameters.condensingTempC ?? ''"
               @input="store.parameters.condensingTempC = (($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)" />
      </div>
      <div class="field">
        <label>Refrigerant *</label>
        <select v-model="store.parameters.refrigerant">
          <option disabled :value="null">— select —</option>
          <option v-for="f in fluidOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>
      <div class="field">
        <label>Airflow (m³/h)</label>
        <input type="number" step="100" :value="store.parameters.airflowM3h ?? ''"
               @input="store.parameters.airflowM3h = (($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)" />
      </div>
      <div class="field" v-if="capacityModes && Array.isArray(capacityModes)">
        <label>Capacity mode</label>
        <select>
          <option v-for="(m, i) in (capacityModes as any[])" :key="i" :value="(m as any).id ?? i">
            {{ (m as any).name ?? `Mode ${i + 1}` }}
          </option>
        </select>
        <span class="hint">{{ (capacityModes as any[]).length }} modes from API</span>
      </div>
    </div>

    <ActionBar step="inputs" :next-disabled="!canProceed" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
@media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
</style>
