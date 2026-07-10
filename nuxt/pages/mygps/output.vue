<script setup lang="ts">
/**
 * Step 6 — Selector Output (Result-Grid)
 *
 * Schickt die Wizard-Parameter an POST /findunits. Bis das Request-Schema
 * verifiziert ist, senden wir nur die zwingenden Felder + languageID.
 * Bei Fehler fällt die UI auf eine demo-Tabelle zurück.
 */

useHead({ title: 'myGPS — Selector Output' });

const store = useConfigStore();
const { formatCapacity } = useUnits();

const findRequest = computed(() => ({
  languageID: 2,
  capacity: store.parameters.coolingCapacityKw,
  evaporatingTemperature: store.parameters.evaporatingTempC,
  condensingTemperature: store.parameters.condensingTempC,
  refrigerant: store.parameters.refrigerant,
  airflow: store.parameters.airflowM3h
}));

const { data: units, error, pending, refresh } = await useAsyncData(
  'mygps-output-findunits',
  () => useGpceu().findUnits(findRequest.value as any).catch(() => null),
  { default: () => null, watch: [findRequest] }
);

// Demo-Daten, damit die Tabelle ohne API-Auth sichtbar ist
const demoUnits = [
  { id: 'demo-1', typeDesignation: 'GFH 031B/1-S', capacity: 21.4, airflowM3h: 11200, fanDiameter: 500, weightKg: 145 },
  { id: 'demo-2', typeDesignation: 'GFH 041B/1-S', capacity: 27.8, airflowM3h: 14800, fanDiameter: 500, weightKg: 168 },
  { id: 'demo-3', typeDesignation: 'GFH 051B/1-S', capacity: 33.1, airflowM3h: 17600, fanDiameter: 630, weightKg: 192 }
];

const rows = computed(() => {
  if (units.value && Array.isArray(units.value) && units.value.length > 0) return units.value as any[];
  return demoUnits;
});

const selectedId = ref<string | null>(null);
function pick(u: any) {
  selectedId.value = u.id;
  store.selectProduct({ productId: String(u.id), typeDesignation: String(u.typeDesignation ?? u.id), quantity: 1 });
}
</script>

<template>
  <section>
    <StepWizard current="output" />

    <h1>Selector output</h1>
    <p class="lede">
      Units matching your inputs ({{ formatCapacity(store.parameters.coolingCapacityKw) }}).
      <button class="btn btn-text" @click="refresh()">Re-run query</button>
    </p>

    <div v-if="pending" class="alert alert-info">Querying GPC.EU /findunits…</div>
    <div v-if="error" class="alert alert-error">
      Live query failed — showing demo rows. Code: <code>{{ (error as any)?.data?.code ?? 'unknown' }}</code>
    </div>
    <div v-if="!error && !units" class="alert alert-info">
      Showing demo data. Live <code>/findunits</code> returned no rows.
    </div>

    <table class="result-table">
      <thead>
        <tr>
          <th>Type designation</th>
          <th>Capacity</th>
          <th>Airflow</th>
          <th>Fan Ø</th>
          <th>Weight</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in rows" :key="u.id" :class="{ 'is-selected': selectedId === u.id }">
          <td class="mono">{{ u.typeDesignation }}</td>
          <td>{{ formatCapacity(u.capacity ?? u.capacityKw ?? null) }}</td>
          <td>{{ u.airflowM3h ?? u.airflow ?? '—' }} m³/h</td>
          <td>{{ u.fanDiameter ?? '—' }} mm</td>
          <td>{{ u.weightKg ?? u.weight ?? '—' }} kg</td>
          <td><button class="btn btn-outline" @click="pick(u)">Select</button></td>
        </tr>
      </tbody>
    </table>

    <ActionBar step="output" :next-disabled="!selectedId" next-label="Run annual analysis →" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); display: flex; align-items: center; gap: var(--space-2); }
.result-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}
.result-table th, .result-table td {
  padding: var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--c-border);
}
.result-table thead th { background: var(--c-surface-muted); font-weight: 600; }
.result-table tbody tr:hover { background: var(--c-surface-muted); }
.result-table tbody tr.is-selected { background: color-mix(in srgb, var(--c-accent) 10%, var(--c-surface)); }
</style>
