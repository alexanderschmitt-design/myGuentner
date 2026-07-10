<script setup lang="ts">
useHead({ title: 'myGPS — Annual Analysis' });

const store = useConfigStore();

const location = ref('');
const ashraeLocation = ref('');
const waterPrice = ref(3.50);
const energyPrice = ref(0.18);
const cyclesConcentration = ref(4);
const loadProfile = ref<'24-7' | 'commercial' | 'industrial' | 'custom'>('commercial');
const minCondTemp = ref(25);

const running = ref(false);
const resultText = ref<string | null>(null);

async function runAnalysis() {
  running.value = true;
  resultText.value = null;
  try {
    const result = await useGpceu().partLoadCalculation({
      languageID: 2,
      location: location.value,
      ashraeLocation: ashraeLocation.value,
      waterPricePerKgal: waterPrice.value,
      energyPricePerKwh: energyPrice.value,
      cyclesOfConcentration: cyclesConcentration.value,
      loadProfile: loadProfile.value,
      minimumCondensingTemperatureC: minCondTemp.value,
      capacityKw: store.parameters.coolingCapacityKw,
      refrigerant: store.parameters.refrigerant
    } as any);
    resultText.value = JSON.stringify(result, null, 2);
  } catch (err: any) {
    resultText.value = `Error: ${err?.data?.code ?? err?.message ?? 'unknown'}`;
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <section>
    <StepWizard current="annual" />

    <h1>Annual analysis</h1>
    <p class="lede">Energy and water cost projection over a typical year.</p>

    <div class="form-grid">
      <div class="field">
        <label>Location</label>
        <input v-model="location" placeholder="City, region" />
      </div>
      <div class="field">
        <label>ASHRAE location</label>
        <input v-model="ashraeLocation" placeholder="ASHRAE 169 climate zone" />
      </div>
      <div class="field">
        <label>Water price ($ / 1000 gal)</label>
        <input type="number" step="0.1" v-model.number="waterPrice" />
      </div>
      <div class="field">
        <label>Energy price ($ / kWh)</label>
        <input type="number" step="0.01" v-model.number="energyPrice" />
      </div>
      <div class="field">
        <label>Cycles of concentration</label>
        <input type="number" step="1" v-model.number="cyclesConcentration" />
      </div>
      <div class="field">
        <label>Load profile</label>
        <select v-model="loadProfile">
          <option value="24-7">24/7 process</option>
          <option value="commercial">Commercial (16h/d)</option>
          <option value="industrial">Industrial (8h/d, 5d/wk)</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div class="field">
        <label>Minimum condensing temperature (°C)</label>
        <input type="number" step="1" v-model.number="minCondTemp" />
      </div>
    </div>

    <div class="run-row">
      <button class="btn btn-primary" :disabled="running" @click="runAnalysis">
        {{ running ? 'Running…' : 'Run annual analysis' }}
      </button>
    </div>

    <pre v-if="resultText" class="result">{{ resultText }}</pre>

    <ActionBar step="annual" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
@media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
.run-row { margin: var(--space-5) 0; }
.result { background: var(--c-surface-muted); padding: var(--space-3); border-radius: var(--radius); font-size: 0.85rem; max-height: 320px; overflow: auto; }
</style>
