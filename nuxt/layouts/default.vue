<script setup lang="ts">
/**
 * Application shell — 1:1 with the Figma headerNavigation
 * (file WHGL55cJW0T7FwpmczbwB0, node 1913:1709) + wizard stepper (1913:1713).
 *
 * Layout:
 *   [ Logo | Search bar (flex-grow, max 400) ] [ Nav items | Divider | Avatar ]
 *
 * Spacing/colors/typography all reference the token variables in tokens.css
 * — every number below is either a token or a Figma-verified fallback.
 */
import GuentnerLogo from '~/components/GuentnerLogo.vue'
import TopStepNav from '~/components/TopStepNav.vue'
import SyncPanel from '~/components/SyncPanel.vue'

const route = useRoute()
const user = useSupabaseUser()
const featureFlags = useFeatureFlags()

// Step-nav under /mygpc/* + on the Datasheet page (both are wizard steps).
const showStepNav = computed(
  () => route.path.startsWith('/mygpc') || route.path === '/gpc-details'
)

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
    <!-- =============================================
         Header — Figma node 1913:1709 (headerNavigation)
         Full-width band with the actual header row constrained to
         1200px and centered inside it.
         ============================================= -->
    <div class="site-header-band">
    <header class="site-header">
      <div class="left-nav">
        <div class="logo-wrap">
          <GuentnerLogo />
        </div>

        <label class="search-field">
          <span class="search-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="20" height="20">
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <line x1="13.5" y1="13.5" x2="17" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </span>
          <input v-model="search" type="search" placeholder="Search anything" aria-label="Search" />
          <span class="camera-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 4.5a1.5 1.5 0 0 1 1.5-1.5h1L5.5 2h5l1 1h1a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7z"/>
              <circle cx="8" cy="8.5" r="2.5"/>
            </svg>
          </span>
        </label>
      </div>

      <nav class="right-nav">
        <div class="nav-items">
          <a href="#" class="nav-link">Overview</a>
          <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' }">myGPC</NuxtLink>
          <a href="#" class="nav-link">mySpareParts</a>
          <a href="#" class="nav-link">myProjects</a>
          <a href="#" class="nav-link nav-link-caret">
            myTools
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <a href="#" class="nav-link">myServices</a>
          <a href="#" class="nav-link">Documents</a>
        </div>

        <div class="header-icons">
          <button type="button" class="icon-btn" aria-label="Favorites">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 2.5l2.5 5.1 5.6.8-4.05 3.95.96 5.6L10 15.3l-5.01 2.65.96-5.6L1.9 8.4l5.6-.8L10 2.5z"/>
            </svg>
          </button>
          <button type="button" class="icon-btn" aria-label="Notifications">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.5 13.5v-3a5.5 5.5 0 1 1 11 0v3l1.5 2h-14l1.5-2z"/>
              <path d="M8 16.5a2 2 0 0 0 4 0"/>
            </svg>
          </button>
          <button type="button" class="icon-btn icon-btn-labeled" aria-label="Cart">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.5 3.5h2l2 10h9l2-7h-11"/>
              <circle cx="7.5" cy="17" r="1.2"/>
              <circle cx="14.5" cy="17" r="1.2"/>
            </svg>
            <span>Cart</span>
          </button>
        </div>

        <span class="menu-divider" aria-hidden="true"></span>

        <button
          v-if="user"
          class="avatar-group"
          :title="user.email || ''"
          @click="panelsOpen = !panelsOpen"
          :aria-pressed="panelsOpen"
          aria-label="Toggle side panel"
        >
          <svg class="avatar-chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="avatar-badge">{{ initials(user.email) }}</span>
        </button>
      </nav>
    </header>
    </div>

    <TopStepNav v-if="showStepNav" />

    <main class="site-main" :class="{ 'with-panel': panelsOpen }">
      <slot />
    </main>

    <aside v-if="panelsOpen" class="side-panel">
      <SyncPanel />
    </aside>

    <ChatDock v-if="user && featureFlags.isOn('chatbot')" />
    <LearnModeOverlay />
    <ToastStack />

    <footer class="site-footer">
      <div class="footer-left">
        <GuentnerLogo />
        <NuxtLink to="/admin" class="footer-admin-link">Admin</NuxtLink>
      </div>
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
  background: var(--c-bg);
}

/* ================== HEADER ================== */
/* Outer band — full-width white bar with the bottom divider */
.site-header-band {
  background: var(--c-nav-background);
  border-bottom: 1px solid var(--c-nav-divider);
}
/* Inner row — capped at 1200px and centered inside the band */
.site-header {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-xs);                    /* 14px */
  display: flex;
  align-items: center;
  gap: var(--space-xs2);                       /* 9px */
}
.left-nav {
  flex: 1 0 0;
  display: flex;
  align-items: center;
  gap: var(--space-xs2);                       /* 9px */
  min-width: 0;
}
.logo-wrap {
  padding: var(--space-xs2);                   /* 9px */
  border-radius: var(--radius-md);             /* 8px */
  display: inline-flex;
}
.right-nav {
  display: flex;
  align-items: center;
  gap: var(--space-xs2);                       /* 9px */
  flex-shrink: 0;
}

/* Search field — Figma _navItem/search */
.search-field {
  flex: 1 0 0;
  max-width: 400px;
  min-width: 130px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: var(--space-xs2);                       /* 9px */
  padding: var(--space-xs2) var(--space-xs2) var(--space-xs2) var(--space-xs);
  background: var(--c-nav-search-bg);
  border-radius: var(--radius-md);             /* 8px */
  color: var(--c-nav-search-text);
  transition: box-shadow 0.15s;
}
.search-field:focus-within { box-shadow: var(--shadow-focus); }
.search-icon { color: var(--c-nav-search-trailing); display: inline-flex; flex-shrink: 0; }
.camera-icon { color: var(--c-nav-search-trailing); display: inline-flex; flex-shrink: 0; }
.search-field input {
  flex: 1 0 0;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-xs);                   /* 15.69px */
  line-height: var(--lh-xs);
  color: var(--c-nav-search-text);
}
.search-field input::placeholder { color: var(--c-nav-search-text); }

/* Nav items — Figma _navItem/button */
.nav-items {
  display: flex;
  gap: var(--space-xs4);                       /* 3px */
  align-items: center;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs2);                       /* 9px */
  padding: var(--space-xs2);                   /* 9px */
  border-radius: var(--radius-xs2);            /* 2px */
  font-family: var(--font-ui);
  font-size: var(--font-2xs);                  /* 14.17px */
  line-height: var(--lh-2xs);                  /* 16px */
  letter-spacing: 0.1px;
  color: var(--c-nav-button-text);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
}
.nav-link:hover { color: var(--c-text); }
.nav-link.active {
  color: var(--c-brand-blue);
  font-weight: 500;
  background: color-mix(in srgb, var(--c-brand-blue) 12%, transparent);
  border-radius: var(--radius-md);
}
.nav-link-caret svg { color: currentColor; }

/* Header icon-only buttons (favorites, bell, cart). Cart carries a
   text label alongside the icon; the others are icon-only. */
.header-icons {
  display: flex;
  align-items: center;
  gap: var(--space-xs3);
  padding-left: var(--space-xs2);
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs3);
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--c-nav-button-text);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: var(--c-nav-search-bg); color: var(--c-text); }
.icon-btn-labeled { padding: 6px 10px; }
.icon-btn svg { flex-shrink: 0; }

/* Divider between nav items and avatar */
.menu-divider {
  display: inline-block;
  width: 1px;
  height: 20px;
  background: var(--c-border);
}

/* Avatar group — Figma _avatar */
.avatar-group {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);                       /* 5px */
  padding: var(--space-xs4);                   /* 3px */
  background: var(--c-nav-search-bg);
  border-radius: var(--radius-xs);             /* 4px */
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.avatar-group:hover { background: var(--c-border); }
.avatar-chev { color: var(--c-nav-search-trailing); }
.avatar-badge {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-nav-accent);
  color: var(--c-nav-accent-text);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-weight: 500;
  font-size: var(--font-4xs);                  /* 11.58px */
  line-height: var(--lh-4xs);                  /* 14px */
  letter-spacing: 0.1px;
}

/* ================== MAIN + FOOTER ================== */
.site-main {
  flex: 1;
  padding: var(--space-5) var(--space-6);      /* 24 / 32 */
  background: var(--c-bg);
}
.site-main.with-panel { padding-right: 340px; }

.side-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 320px;
  background: white;
  border-left: 1px solid var(--c-border);
  padding: var(--space-4);
  overflow-y: auto;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.site-footer {
  background: var(--c-surface);
  border-top: 1px solid var(--c-nav-divider);
  padding: var(--space-4) var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--font-3xs);                  /* 12.81px */
  color: var(--c-text-medium);
}
.footer-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.footer-admin-link {
  color: var(--c-text-medium);
  text-decoration: none;
  font-size: var(--font-3xs);
}
.footer-admin-link:hover { color: var(--c-text); }
.footer-admin-link.router-link-active { color: var(--c-brand-blue); }
.footer-links {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}
.footer-links a { color: var(--c-text-medium); text-decoration: none; }
.footer-links a:hover { color: var(--c-text); }
.copy { color: var(--c-text-medium); }

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .site-header { flex-wrap: wrap; padding: 10px var(--space-4); gap: var(--space-3); }
  .left-nav { order: 2; flex-basis: 100%; }
  .right-nav { order: 1; margin-left: auto; }
  .nav-items { display: none; }
  .site-main { padding: var(--space-4); }
  .site-main.with-panel { padding-right: var(--space-4); }
  .side-panel { width: 100vw; }
  .site-footer { flex-direction: column; align-items: flex-start; padding: 12px var(--space-4); }
}
</style>
