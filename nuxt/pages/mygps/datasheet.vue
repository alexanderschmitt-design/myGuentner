<script setup lang="ts">
/**
 * Step 8 — Datasheet
 *
 * Ruft unitfeatures + unitbidtext live. getgpcfilecontent wird genutzt, sobald
 * eine fileId aus dem unitfeatures-Response bekannt ist (TODO bei realem Schema).
 */

useHead({ title: 'myGPS — Datasheet' });

const store = useConfigStore();
const { formatCapacity } = useUnits();

const selected = computed(() => store.selectedProducts[0] ?? null);

const featuresReq = computed(() => ({
  languageID: 2,
  productId: selected.value?.productId,
  typeDesignation: selected.value?.typeDesignation
}));

const { data: features, error: featuresError } = await useAsyncData(
  'mygps-datasheet-features',
  () => selected.value ? useGpceu().unitFeatures(featuresReq.value as any).catch(() => null) : Promise.resolve(null),
  { default: () => null, watch: [selected] }
);

const { data: bidText, error: bidTextError } = await useAsyncData(
  'mygps-datasheet-bidtext',
  () => selected.value ? useGpceu().unitBidText(featuresReq.value as any).catch(() => null) : Promise.resolve(null),
  { default: () => null, watch: [selected] }
);
</script>

<template>
  <section>

    <h1>Datasheet</h1>
    <p class="lede">Final summary for {{ store.project.name || 'this project' }}.</p>

    <div v-if="!selected" class="alert alert-info">
      No unit selected. Go back to <NuxtLink to="/mygps/output">Selector Output</NuxtLink> and pick one.
    </div>

    <article v-if="selected" class="datasheet">
      <header>
        <h2 class="mono">{{ selected.typeDesignation }}</h2>
        <p>Project: <strong>{{ store.project.name || '—' }}</strong></p>
      </header>

      <dl class="specs">
        <dt>Cooling capacity</dt>           <dd>{{ formatCapacity(store.parameters.coolingCapacityKw) }}</dd>
        <dt>Refrigerant</dt>                <dd class="mono">{{ store.parameters.refrigerant ?? '—' }}</dd>
        <dt>Evap. temp.</dt>                <dd>{{ store.parameters.evaporatingTempC ?? '—' }} °C</dd>
        <dt>Cond. temp.</dt>                <dd>{{ store.parameters.condensingTempC ?? '—' }} °C</dd>
      </dl>

      <div class="api-block">
        <h3>Unit features (live from <code>/unitfeatures</code>)</h3>
        <pre v-if="features">{{ JSON.stringify(features, null, 2) }}</pre>
        <p v-if="featuresError" class="alert alert-error">
          {{ (featuresError as any)?.data?.code ?? 'Live data unavailable' }}
        </p>
      </div>

      <div class="api-block">
        <h3>Bid text (live from <code>/unitbidtext</code>)</h3>
        <pre v-if="bidText">{{ JSON.stringify(bidText, null, 2) }}</pre>
        <p v-if="bidTextError" class="alert alert-error">
          {{ (bidTextError as any)?.data?.code ?? 'Live data unavailable' }}
        </p>
      </div>
    </article>

    <ActionBar step="datasheet" next-label="Save configuration" @next="$router.push('/')" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }
.datasheet { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius); padding: var(--space-5); }
.datasheet header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--c-border); padding-bottom: var(--space-3); margin-bottom: var(--space-4); }
.specs { display: grid; grid-template-columns: auto 1fr; gap: var(--space-2) var(--space-5); margin: 0 0 var(--space-5); }
.specs dt { color: var(--c-text-muted); }
.specs dd { margin: 0; font-weight: 600; }
.api-block { margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px dashed var(--c-border); }
.api-block h3 { font-size: 0.95rem; margin: 0 0 var(--space-2); }
pre { background: var(--c-surface-muted); padding: var(--space-3); border-radius: var(--radius); font-size: 0.8rem; max-height: 320px; overflow: auto; }
</style>
