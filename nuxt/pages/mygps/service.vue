<script setup lang="ts">
useHead({ title: 'myGPS — Service & Pricing' });

const store = useConfigStore();

// Two-way binding directly to the store slice. Values persist across nav + reload.
const quantity = computed<number>({
  get: () => store.service.quantity,
  set: (v) => store.updateService({ quantity: v })
});
const startupSupport = computed<boolean>({
  get: () => store.service.startupSupport,
  set: (v) => store.updateService({ startupSupport: v })
});
const discountPct = computed<number>({
  get: () => store.service.discountPercent,
  set: (v) => store.updateService({ discountPercent: v })
});
const notes = computed<string>({
  get: () => store.service.notes,
  set: (v) => store.updateService({ notes: v })
});
</script>

<template>
  <section>
    <StepWizard current="service" />

    <h1>Service & pricing</h1>
    <p class="lede">Optional commissioning support and commercial settings.</p>

    <div class="form-grid">
      <div class="field">
        <label>Quantity</label>
        <input type="number" min="1" v-model.number="quantity" />
      </div>
      <div class="field">
        <label>Product discount %</label>
        <input type="number" min="0" max="100" v-model.number="discountPct" />
      </div>
      <div class="field field-inline">
        <label>
          <input type="checkbox" v-model="startupSupport" />
          Include on-site start-up support
        </label>
      </div>
      <div class="field field-span">
        <label>Notes for the quote</label>
        <textarea v-model="notes" rows="3" placeholder="Special installation requirements, commercial terms, …"></textarea>
      </div>
    </div>

    <ActionBar step="service" next-label="Rate equipment →" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.field-span { grid-column: 1 / -1; }
.field-inline label { display: flex; align-items: center; gap: var(--space-2); }
@media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
</style>
