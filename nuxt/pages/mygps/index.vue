<script setup lang="ts">
/**
 * Step 1 — Kategoriewahl
 *
 * Live: ruft productcategories aus der GPC.EU-API (SSR-fähig via useAsyncData).
 * Fällt auf die hartcodierten 5 Kategorien aus Planning.md zurück, wenn die API
 * leer/down ist — damit man auch ohne Backend-ENV im Frontend etwas sieht.
 */
import { MYGPS_FLOWS } from '~/composables/useFlows';

useHead({ title: 'myGPS — Categories' });

const store = useConfigStore();
const router = useRouter();

const { data: apiCats, error: apiError } = await useAsyncData(
  'mygps-categories',
  () => useGpceu().productCategories(2).catch(() => null),
  { default: () => null }
);

const localCats = Object.values(MYGPS_FLOWS);
const showApiHint = computed(() => !!apiError.value || !apiCats.value);

const modalCat = ref<string | null>(null);
const modalCatObj = computed(() => modalCat.value ? MYGPS_FLOWS[modalCat.value] : null);

function pickCategory(slug: string) {
  const cat = MYGPS_FLOWS[slug];
  if (!cat) return;
  if (cat.subcategories === null) {
    store.currentCategory = slug;
    store.currentSubcategory = null;
    router.push('/mygps/projects');
    return;
  }
  modalCat.value = slug;
}
function pickSubcategory(subKey: string) {
  if (!modalCat.value) return;
  store.currentCategory = modalCat.value;
  store.currentSubcategory = subKey;
  modalCat.value = null;
  router.push('/mygps/projects');
}
</script>

<template>
  <section class="cat-page">
    <header>
      <h1>Choose a product category</h1>
      <p class="lede">Step 1 of the myGPS specification flow.</p>
    </header>

    <div v-if="showApiHint" class="alert alert-info">
      Showing the static category map from <code>Planning.md</code>.
      Live <code>productcategories</code> from the GPC.EU API are not available —
      check <NuxtLink to="/_debug">Debug</NuxtLink> for details.
    </div>

    <div class="card-grid">
      <button v-for="cat in localCats" :key="cat.slug" class="cat-card" @click="pickCategory(cat.slug)">
        <span class="cat-title">{{ cat.label }}</span>
        <span v-if="cat.subcategories === null" class="cat-hint">Direct to wizard</span>
        <span v-else class="cat-hint">{{ Object.keys(cat.subcategories).length }} subcategories</span>
      </button>
    </div>

    <div v-if="apiCats?.length" class="api-debug">
      <details>
        <summary>{{ apiCats.length }} categories from API (live)</summary>
        <pre>{{ JSON.stringify(apiCats.slice(0, 5), null, 2) }}</pre>
      </details>
    </div>

    <!-- Subcategory-Modal -->
    <div v-if="modalCatObj && modalCatObj.subcategories" class="modal-backdrop" @click.self="modalCat = null">
      <div class="modal">
        <h2>{{ modalCatObj.label }}</h2>
        <p class="hint">Please choose between</p>
        <div class="sub-grid">
          <button
            v-for="(sub, key) in modalCatObj.subcategories"
            :key="key"
            class="btn btn-primary"
            @click="pickSubcategory(String(key))"
          >
            {{ sub.label }}
          </button>
        </div>
        <button class="btn btn-text" @click="modalCat = null">Cancel</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cat-page { max-width: 960px; }
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }

.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); }
.cat-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: var(--space-5);
  text-align: left;
  cursor: pointer;
  font: inherit;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: var(--transition-accent), transform 120ms ease;
}
.cat-card:hover { border-color: var(--c-accent); transform: translateY(-2px); }
.cat-title { font-weight: 600; color: var(--c-accent); }
.cat-hint { color: var(--c-text-muted); font-size: 0.875rem; }

.api-debug { margin-top: var(--space-5); }
.api-debug pre { background: var(--c-surface-muted); padding: var(--space-3); border-radius: var(--radius); font-size: 0.8rem; }

.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: grid; place-items: center;
  padding: var(--space-4);
  z-index: 100;
}
.modal {
  background: var(--c-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  max-width: 480px;
  width: 100%;
  box-shadow: var(--shadow-md);
}
.modal h2 { margin: 0 0 var(--space-1); color: var(--c-accent); }
.modal .hint { color: var(--c-text-muted); margin: 0 0 var(--space-4); }
.sub-grid { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
</style>
