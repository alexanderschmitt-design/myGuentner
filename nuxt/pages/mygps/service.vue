<script setup lang="ts">
useHead({ title: 'myGPS — Service & Pricing' });

const quantity = ref(1);
const model = ref('');
const startup = ref<'none' | 'remote' | 'in-person'>('none');
const state = ref('');
const discountPct = ref(0);
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
        <label>Model</label>
        <input v-model="model" placeholder="e.g. GFH 031B/1-S" />
      </div>
      <div class="field">
        <label>Start-up</label>
        <select v-model="startup">
          <option value="none">No start-up service</option>
          <option value="remote">Remote start-up</option>
          <option value="in-person">In-person start-up</option>
        </select>
      </div>
      <div class="field">
        <label>State (for service quote)</label>
        <input v-model="state" placeholder="e.g. Bavaria" />
      </div>
      <div class="field">
        <label>Product discount %</label>
        <input type="number" min="0" max="100" v-model.number="discountPct" />
      </div>
    </div>

    <ActionBar step="service" next-label="Rate equipment →" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
@media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
</style>
