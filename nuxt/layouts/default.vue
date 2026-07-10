<script setup lang="ts">
import PerspectiveSwitcher from '~/components/PerspectiveSwitcher.vue';
import SyncPanel from '~/components/SyncPanel.vue';
</script>

<template>
  <div class="app-shell" :data-perspective="useConfigStore().activePerspective">
    <header class="site-header">
      <NuxtLink to="/" class="brand">myGPC</NuxtLink>
      <nav class="site-nav">
        <NuxtLink to="/mygps">myGPS Wizard</NuxtLink>
        <NuxtLink to="/_debug">Debug</NuxtLink>
      </nav>
      <PerspectiveSwitcher class="header-perspective" />
    </header>

    <main class="site-main">
      <slot />
    </main>

    <SyncPanel class="site-sync-panel" />

    <footer class="site-footer">
      <span>Güntner Product Configurator · Phase 3 (Nuxt + GPC.EU)</span>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr min(320px, 25vw);
  grid-template-areas:
    'header header'
    'main   sync'
    'footer footer';
  min-height: 100vh;
}
.site-header {
  grid-area: header;
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}
.brand {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--c-accent);
  text-decoration: none;
}
.site-nav {
  display: flex;
  gap: var(--space-4);
}
.site-nav a {
  color: var(--c-text-muted);
  text-decoration: none;
}
.site-nav a.router-link-active { color: var(--c-accent); font-weight: 600; }
.header-perspective { margin-left: auto; }
.site-main { grid-area: main; padding: var(--space-6); }
.site-sync-panel {
  grid-area: sync;
  border-left: 1px solid var(--c-border);
  padding: var(--space-4);
  background: var(--c-surface-muted);
}
.site-footer {
  grid-area: footer;
  padding: var(--space-3) var(--space-6);
  border-top: 1px solid var(--c-border);
  color: var(--c-text-muted);
  font-size: 0.875rem;
}
@media (max-width: 900px) {
  .app-shell { grid-template-columns: 1fr; grid-template-areas: 'header' 'main' 'sync' 'footer'; }
  .site-sync-panel { border-left: none; border-top: 1px solid var(--c-border); }
}
</style>
