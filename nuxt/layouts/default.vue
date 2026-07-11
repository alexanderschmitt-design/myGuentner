<script setup lang="ts">
import GuentnerLogo from '~/components/GuentnerLogo.vue'
import TopStepNav from '~/components/TopStepNav.vue'
import SyncPanel from '~/components/SyncPanel.vue'

const route = useRoute()
const user = useSupabaseUser()

// Show step-nav only on /mygps/* routes
const showStepNav = computed(() => route.path.startsWith('/mygps'))

// SyncPanel is opt-in via query flag ?panels=1. Layout PNGs don't show it,
// but CLAUDE.md §6 says it must exist — so we keep it as a toggle-able drawer.
const panelsOpen = ref(false)
const search = ref('')

function initials(email: string | null | undefined): string {
  if (!email) return '??'
  const name = email.split('@')[0]
  const parts = name.split(/[.\-_]/).filter(Boolean)
  const first = parts[0]?.[0] || name[0] || '?'
  const second = parts[1]?.[0] || name[1] || ''
  return (first + second).toUpperCase()
}
</script>

<template>
  <div class="app-shell" :data-perspective="useConfigStore().activePerspective">
    <!-- Top header (matches layout PNGs) -->
    <header class="site-header">
      <GuentnerLogo />

      <div class="search">
        <span class="icon" aria-hidden="true">🔍</span>
        <input v-model="search" type="search" placeholder="Search anything" aria-label="Search" />
      </div>

      <nav class="site-nav">
        <a href="#" class="nav-link">Overview</a>
        <NuxtLink to="/" class="nav-link active">myGPC</NuxtLink>
        <a href="#" class="nav-link">mySpareParts</a>
        <a href="#" class="nav-link">myTools ▾</a>
        <a href="#" class="nav-link">Documents</a>

        <button
          v-if="user"
          class="avatar"
          :title="user.email || ''"
          @click="panelsOpen = !panelsOpen"
          :aria-pressed="panelsOpen"
          aria-label="Toggle side panel"
        >{{ initials(user.email) }}</button>
      </nav>
    </header>

    <!-- Step-navigation bar (only on /mygps/*) -->
    <TopStepNav v-if="showStepNav" />

    <!-- Main content -->
    <main class="site-main" :class="{ 'with-panel': panelsOpen }">
      <slot />
    </main>

    <!-- Right-side drawer for the cross-perspective mirror -->
    <aside v-if="panelsOpen" class="side-panel">
      <SyncPanel />
    </aside>

    <!-- Footer -->
    <footer class="site-footer">
      <GuentnerLogo />
      <div class="footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Legal Notice</a>
        <a href="#">Terms &amp; Conditions</a>
        <span class="copy">Copyright © 2026 Güntner GmbH &amp; Co. KG</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--c-surface-muted);
}

/* ---- Header ---- */
.site-header {
  background: white;
  border-bottom: 1px solid var(--c-border);
  padding: 12px 32px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.search {
  flex: 1;
  max-width: 480px;
  position: relative;
  display: flex;
  align-items: center;
  background: var(--c-surface-muted);
  border-radius: var(--radius);
  padding: 8px 12px;
  gap: 8px;
}
.search .icon { opacity: 0.6; }
.search input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 0.9rem;
  color: var(--c-text);
}
.site-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: auto;
}
.nav-link {
  color: var(--c-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 6px 4px;
  transition: color 0.15s;
}
.nav-link:hover { color: var(--c-text); }
.nav-link.active { color: var(--c-primary); font-weight: 600; }
.avatar {
  margin-left: 8px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: var(--c-primary);
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: filter 0.15s;
}
.avatar:hover { filter: brightness(1.1); }

/* ---- Main ---- */
.site-main {
  flex: 1;
  padding: 24px 32px;
  max-width: 100%;
  background: var(--c-surface-muted);
}
.site-main.with-panel {
  padding-right: 340px;
}

/* ---- Side drawer ---- */
.side-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 320px;
  background: white;
  border-left: 1px solid var(--c-border);
  padding: 20px;
  overflow-y: auto;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

/* ---- Footer ---- */
.site-footer {
  background: white;
  border-top: 1px solid var(--c-border);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 0.8rem;
}
.footer-links {
  display: flex;
  align-items: center;
  gap: 20px;
  color: var(--c-text-muted);
}
.footer-links a { color: var(--c-text-muted); text-decoration: none; }
.footer-links a:hover { color: var(--c-text); }
.copy { color: var(--c-text-muted); }

@media (max-width: 900px) {
  .site-header { flex-wrap: wrap; padding: 10px 16px; gap: 12px; }
  .search { order: 3; flex-basis: 100%; max-width: 100%; }
  .site-nav { gap: 12px; margin-left: 0; overflow-x: auto; flex-wrap: nowrap; }
  .site-main { padding: 16px; }
  .site-main.with-panel { padding-right: 16px; }
  .side-panel { width: 100vw; }
  .site-footer { flex-direction: column; align-items: flex-start; padding: 12px 16px; }
}
</style>
