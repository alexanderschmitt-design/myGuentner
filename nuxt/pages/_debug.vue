<script setup lang="ts">
useHead({ title: 'myGPC — Debug' });

// useAsyncData → läuft serverseitig, Ergebnis ins Hydration-Payload geschrieben.
// Bei Error fängt error.value den FetchError; .data hat das Proxy-Body.
const { data: health, error: healthError, refresh: refreshHealth } = await useAsyncData(
  'gpceu-health',
  () => useGpceu().health(),
  { default: () => null }
);

const { data: version, error: versionError, refresh: refreshVersion } = await useAsyncData(
  'gpceu-version',
  () => useGpceu().version(),
  { default: () => null }
);

const { data: categories, error: catError, refresh: refreshCats } = await useAsyncData(
  'gpceu-cats',
  () => useGpceu().productCategories(2),
  { default: () => [] as unknown[] }
);

const { data: fluids, error: fluidError, refresh: refreshFluids } = await useAsyncData(
  'gpceu-fluids',
  () => useGpceu().fluids(2),
  { default: () => null }
);
// Fluids-Endpoint liefert { success, message, content[] } — wir greifen auf content.
const fluidList = computed(() => fluids.value?.content ?? []);

function fmtError(e: unknown): string {
  if (!e) return '';
  const err = e as { data?: { code?: string; error?: string; hint?: string }; status?: number; message?: string };
  if (err.data?.code) {
    return `[${err.data.code}] ${err.data.error || ''}${err.data.hint ? ' — ' + err.data.hint : ''}`;
  }
  return `[HTTP ${err.status ?? '?'}] ${err.message ?? String(e)}`;
}

async function refreshAll() {
  await Promise.all([refreshHealth(), refreshVersion(), refreshCats(), refreshFluids()]);
}
</script>

<template>
  <section class="debug">
    <header class="debug-head">
      <h1>GPC.EU Debug</h1>
      <button class="btn btn-outline" @click="refreshAll">Refresh all</button>
    </header>

    <p class="lede">
      Live smoke-test against <code>/api/gpc-eu/*</code>. Calls run server-side first
      (SSR) and re-run on refresh in the browser.
    </p>

    <article class="probe">
      <h2>1. <code>/health</code></h2>
      <pre v-if="health">{{ JSON.stringify(health, null, 2) }}</pre>
      <p v-if="healthError" class="alert alert-error">{{ fmtError(healthError) }}</p>
    </article>

    <article class="probe">
      <h2>2. <code>/gpcversion</code></h2>
      <pre v-if="version">{{ JSON.stringify(version, null, 2) }}</pre>
      <p v-if="versionError" class="alert alert-error">{{ fmtError(versionError) }}</p>
    </article>

    <article class="probe">
      <h2>3. <code>/productcategories?languageID=2</code></h2>
      <p v-if="categories?.length">{{ categories.length }} categories</p>
      <pre v-if="categories?.length">{{ JSON.stringify(categories.slice(0, 3), null, 2) }}</pre>
      <p v-if="catError" class="alert alert-error">{{ fmtError(catError) }}</p>
    </article>

    <article class="probe">
      <h2>4. <code>/fluids?languageID=2</code></h2>
      <p v-if="fluidList.length">{{ fluidList.length }} fluids</p>
      <pre v-if="fluidList.length">{{ JSON.stringify(fluidList.slice(0, 3), null, 2) }}</pre>
      <p v-if="fluidError" class="alert alert-error">{{ fmtError(fluidError) }}</p>
    </article>
  </section>
</template>

<style scoped>
.debug { max-width: 960px; }
.debug-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
h1 { margin: 0; color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin: var(--space-2) 0 var(--space-5); }
.probe {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.probe h2 { margin: 0 0 var(--space-3); font-size: 1rem; }
pre {
  background: var(--c-surface-muted);
  padding: var(--space-3);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  overflow-x: auto;
  margin: 0;
}
</style>
