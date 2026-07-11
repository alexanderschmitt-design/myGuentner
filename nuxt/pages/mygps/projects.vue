<script setup lang="ts">
useHead({ title: 'myGPS — Project Info' });

const store = useConfigStore();

const countries = [
  'Germany', 'Austria', 'Switzerland', 'France', 'Italy', 'Spain',
  'Netherlands', 'United Kingdom', 'United States', 'Canada', 'Mexico',
  'Brazil', 'United Arab Emirates', 'India', 'China', 'Japan', 'Australia'
];

const canProceed = computed(() =>
  store.project.name.trim().length > 0 && store.project.country.length > 0
);
</script>

<template>
  <section>

    <h1>Project information</h1>
    <p class="lede">These fields appear on the generated datasheet and quote.</p>

    <div class="form-grid">
      <div class="field">
        <label for="proj-name">Project name *</label>
        <input id="proj-name" v-model="store.project.name" placeholder="e.g. Cold-Store Hamburg" />
      </div>
      <div class="field">
        <label for="proj-contact">Contact name</label>
        <input id="proj-contact" v-model="store.project.contact" placeholder="Full name" />
      </div>
      <div class="field">
        <label for="proj-city">City</label>
        <input id="proj-city" v-model="store.project.city" />
      </div>
      <div class="field">
        <label for="proj-state">State / Province</label>
        <input id="proj-state" v-model="store.project.state" />
      </div>
      <div class="field">
        <label for="proj-country">Country *</label>
        <select id="proj-country" v-model="store.project.country">
          <option disabled value="">— select —</option>
          <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <ActionBar step="projects" :next-disabled="!canProceed" />
  </section>
</template>

<style scoped>
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-5); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
@media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
</style>
