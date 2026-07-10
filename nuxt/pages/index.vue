<script setup lang="ts">
useHead({ title: 'myGPC — Start' });

const wizards = [
  { to: '/mygps', label: 'myGPS Wizard', desc: 'Configure a Güntner unit step-by-step using the GPC.EU Customer API.' },
  { to: '/_debug', label: 'API Debug', desc: 'Live health- and smoke-checks against /api/gpc-eu/*.' }
];
</script>

<template>
  <section class="landing">
    <h1>Güntner Product Configurator</h1>
    <p class="lede">Phase 3 — Vue/Nuxt-Frontend mit live GPC.EU-API-Anbindung.</p>

    <div class="card-grid">
      <NuxtLink v-for="w in wizards" :key="w.to" :to="w.to" class="card">
        <h2>{{ w.label }}</h2>
        <p>{{ w.desc }}</p>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.landing { max-width: 960px; }
h1 { margin: 0 0 var(--space-2); color: var(--c-accent); }
.lede { color: var(--c-text-muted); margin-bottom: var(--space-6); }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4); }
.card {
  display: block;
  padding: var(--space-5);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  text-decoration: none;
  color: inherit;
  transition: border-color 120ms ease, transform 120ms ease;
}
.card:hover { border-color: var(--c-accent); transform: translateY(-2px); }
.card h2 { margin: 0 0 var(--space-2); font-size: 1.125rem; color: var(--c-accent); }
.card p { margin: 0; color: var(--c-text-muted); font-size: 0.95rem; }
</style>
