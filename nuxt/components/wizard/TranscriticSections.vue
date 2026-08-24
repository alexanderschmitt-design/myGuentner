<script setup lang="ts">
/**
 * TranscriticSections — Cat 10 (Gas cooler CO₂) Zwei-Sektionen-Layout.
 *
 * Rendert im Thermodynamics-Wizard zwei separate Karten:
 *   1) "Subcooler / supercritic" — der supercritic-Kreis mit Druck, Inlet-/
 *      Outlet-Temp, Kapazität, Rel-Humidity, Air-Temp, Max-Pressure-Drop
 *   2) "Condenser / subcritic" — der subcritic-Kreis mit Kapazität +
 *      dediziertem Air-Block
 *
 * Alle Werte werden auf das `store.parameters.transcritic`-Sub-Objekt
 * gebunden. Wird aus `pages/mygpc/[catId]/thermodynamics.vue` gemountet
 * wenn `current.showTranscriticSection` === true.
 *
 * Live-Referenz: nuxt/public/cat10.png (rechte Bildhälfte).
 */

import { computed } from 'vue'

const store = useConfigStore()

// Defensiv gegen Alt-Persist-States, die vor dem transcritic-Refactor
// gespeichert wurden und das Nested-Objekt gar nicht enthalten.
if (!store.parameters.transcritic) {
  store.updateParameters({
    transcritic: {
      enabled: false,
      supercriticPressureMbar: null,
      subcriticCapacityKw: null,
      subcriticFluidTempInletC: null,
      subcriticFluidTempCondC: null,
      subcriticAirTempC: null,
      subcriticRelHumidityPct: null,
      subcriticMaxPressureDropBar: null
    }
  })
}

function bindT<K extends keyof typeof store.parameters.transcritic>(key: K) {
  return computed<any>({
    get: () => store.parameters.transcritic[key],
    set: (v: any) => {
      store.parameters.transcritic = { ...store.parameters.transcritic, [key]: v }
    }
  })
}

const supercriticPressureMbar     = bindT('supercriticPressureMbar')
const subcriticCapacityKw         = bindT('subcriticCapacityKw')
const subcriticFluidTempInletC    = bindT('subcriticFluidTempInletC')
const subcriticFluidTempCondC     = bindT('subcriticFluidTempCondC')
const subcriticAirTempC           = bindT('subcriticAirTempC')
const subcriticRelHumidityPct     = bindT('subcriticRelHumidityPct')
const subcriticMaxPressureDropBar = bindT('subcriticMaxPressureDropBar')

const maxPressureDropAuto = computed<boolean>({
  get: () => store.parameters.maxPressureDropAuto,
  set: (v) => store.updateParameters({ maxPressureDropAuto: v })
})
</script>

<template>
  <!-- Supercritic-Sektion (linke Karte im 2-Spalten-Layout darüber) -->
  <section class="card transcritic-card">
    <h3 class="card-title">Subcooler / supercritic</h3>

    <div class="field">
      <label>Pressure</label>
      <UnitValueInput
        v-model="supercriticPressureMbar"
        quantity="pressure"
        unit="mbar"
        :step="100"
      />
    </div>

    <div class="field">
      <label>Inlet temp.</label>
      <UnitValueInput
        v-model="subcriticFluidTempInletC"
        quantity="temperature"
        unit="C"
        :step="0.5"
      />
    </div>

    <div class="field">
      <label>Outlet temp.</label>
      <UnitValueInput
        v-model="subcriticFluidTempCondC"
        quantity="temperature"
        unit="C"
        :step="0.5"
      />
    </div>

    <div class="field">
      <label>Max. pressure drop in coil</label>
      <div class="input-inline-auto">
        <UnitValueInput
          v-model="subcriticMaxPressureDropBar"
          quantity="pressure"
          unit="bar"
          :step="0.1"
          :disabled="maxPressureDropAuto"
        />
        <label class="auto-toggle">
          <input type="checkbox" v-model="maxPressureDropAuto" />
          Auto
        </label>
      </div>
    </div>
  </section>

  <!-- Subcritic-Sektion (rechte Karte) -->
  <section class="card transcritic-card">
    <h3 class="card-title">Condenser / subcritic</h3>

    <div class="field">
      <label>Capacity</label>
      <UnitValueInput
        v-model="subcriticCapacityKw"
        quantity="power"
        unit="kW"
        :step="0.1"
      />
    </div>

    <div class="field">
      <label>Air inlet temp.</label>
      <UnitValueInput
        v-model="subcriticAirTempC"
        quantity="temperature"
        unit="C"
        :step="0.5"
      />
    </div>

    <div class="field">
      <label>Rel humidity</label>
      <div class="input-with-suffix">
        <input type="number" v-model.number="subcriticRelHumidityPct" placeholder="0" />
        <span class="suffix">%</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.transcritic-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.card-title {
  margin: 0 0 var(--space-xs2);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: var(--lh-xs);
  color: var(--c-text-medium2);
  font-weight: 500;
}
.field { display: flex; flex-direction: column; gap: var(--space-a4); }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  line-height: var(--lh-3xs);
  color: var(--c-text-light2);
  letter-spacing: 0.1px;
}
.input-with-suffix { position: relative; display: flex; align-items: center; }
.input-with-suffix input {
  flex: 1;
  padding: 10px 42px 10px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: var(--lh-xs);
  color: var(--c-text-value);
  outline: none;
}
.input-with-suffix .suffix {
  position: absolute;
  right: 12px;
  color: var(--c-text-light2);
  font-size: var(--font-3xs);
  pointer-events: none;
}
.input-inline-auto { display: flex; align-items: stretch; gap: var(--space-xs); }
.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium2);
  white-space: nowrap;
}
</style>
