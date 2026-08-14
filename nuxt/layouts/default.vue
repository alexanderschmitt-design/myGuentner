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
import PerspectiveSwitcher from '~/components/PerspectiveSwitcher.vue'

const route = useRoute()
const user = useSupabaseUser()
const featureFlags = useFeatureFlags()
const chatDockOpen = useChatDockState()

// Step-nav under /mygpc/* + on the Datasheet page (both are wizard steps).
const showStepNav = computed(
  () => route.path.startsWith('/mygpc') || route.path === '/gpc-details'
)

const panelsOpen = ref(false)
const search = ref('')
const toolsMenuOpen = ref(false)
const profileOpen   = ref(false)

onMounted(() => {
  const onDocClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement
    if (!t.closest('.tools-menu, .nav-link-tools')) toolsMenuOpen.value = false
    if (!t.closest('.profile-menu, .avatar-group'))  profileOpen.value = false
  }
  document.addEventListener('click', onDocClick)
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
})

function initials(email: string | null | undefined): string {
  if (!email) return '??'
  const name = email.split('@')[0]
  const parts = name.split(/[.\-_]/).filter(Boolean)
  const first = parts[0]?.[0] || name[0] || '?'
  const second = parts[1]?.[0] || name[1] || ''
  return (first + second).toUpperCase()
}

function displayName(email: string | null | undefined): string {
  if (!email) return 'User'
  const local = email.split('@')[0]
  const parts = local.split(/[.\-_]/).filter(Boolean)
  if (parts.length < 2) return local.charAt(0).toUpperCase() + local.slice(1)
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

const supabase = useSupabaseClient()
async function logout() {
  profileOpen.value = false
  await supabase.auth.signOut()
  await navigateTo('/login')
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
        <NuxtLink to="/overview" class="logo-wrap" aria-label="myGüntner — Overview">
          <GuentnerLogo />
        </NuxtLink>

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
          <NuxtLink to="/overview" class="nav-link" :class="{ active: route.path === '/overview' }">Overview</NuxtLink>
          <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' || route.path.startsWith('/mygpc') }">myGPC</NuxtLink>
          <NuxtLink to="/spare-parts" class="nav-link" :class="{ active: route.path === '/spare-parts' }">mySpareParts</NuxtLink>
          <NuxtLink to="/projects" class="nav-link" :class="{ active: route.path === '/projects' }">myProjects</NuxtLink>
          <div class="tools-menu">
            <button
              type="button"
              class="nav-link nav-link-caret nav-link-tools"
              :class="{ 'nav-link-tools--open': toolsMenuOpen, active: route.path.startsWith('/tools') }"
              :aria-expanded="toolsMenuOpen"
              aria-haspopup="menu"
              @click.stop="toolsMenuOpen = !toolsMenuOpen"
            >
              myTools
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" :style="{ transform: toolsMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <Transition name="tools-drop">
              <div v-if="toolsMenuOpen" class="tools-dropdown" role="menu">
                <NuxtLink to="/tools/adiabatic-efficiency" class="tools-item" role="menuitem" @click="toolsMenuOpen = false">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 12l4-8 3 6 3-4 4 6"/>
                    <path d="M3 16h14"/>
                  </svg>
                  <span>Adiabatic Efficiency Calculator</span>
                </NuxtLink>
              </div>
            </Transition>
          </div>
          <NuxtLink to="/documents" class="nav-link" :class="{ active: route.path === '/documents' }">Documents</NuxtLink>
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

        <!-- 3-Ebenen-Switcher per CLAUDE.md — always visible in the header,
             wired via usePerspective() to the shared Pinia store. -->
        <PerspectiveSwitcher class="header-perspective" />

        <span class="menu-divider" aria-hidden="true"></span>

        <div v-if="user" class="profile-cluster">
          <button
            class="avatar-group"
            :class="{ 'avatar-group--open': profileOpen }"
            :title="user.email || ''"
            @click.stop="profileOpen = !profileOpen"
            :aria-expanded="profileOpen"
            aria-haspopup="menu"
            aria-label="Open profile menu"
          >
            <svg class="avatar-chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" :style="{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="avatar-badge">{{ initials(user.email) }}</span>
          </button>

          <Transition name="profile-drop">
            <div v-if="profileOpen" class="profile-menu" role="menu">
              <div class="profile-head">
                <span class="profile-avatar">{{ initials(user.email) }}</span>
                <span class="profile-head-text">
                  <span class="profile-name">{{ displayName(user.email) }}</span>
                  <NuxtLink to="/account" class="profile-view" @click="profileOpen = false">View profile</NuxtLink>
                </span>
              </div>

              <div class="profile-section">
                <button type="button" class="profile-item" role="menuitem" @click="profileOpen = false">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12v9H4z"/><path d="M8 6V4h4v2"/><path d="M4 10h12"/></svg>
                  <span>Companies</span>
                </button>
                <button type="button" class="profile-item" role="menuitem" @click="profileOpen = false">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h8l2 2v12H5z"/><path d="M8 8h6M8 11h4"/><circle cx="14.5" cy="13" r="1.4"/></svg>
                  <span>Sales orders</span>
                </button>
                <NuxtLink to="/account/service-orders" class="profile-item" role="menuitem" @click="profileOpen = false">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="14" rx="1"/><path d="M8 8l1 1 3-3M8 13l1 1 3-3"/></svg>
                  <span>Service orders</span>
                </NuxtLink>
                <button type="button" class="profile-item" role="menuitem" @click="profileOpen = false">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"/><circle cx="10" cy="10" r="2.5"/></svg>
                  <span>Start demo</span>
                </button>
              </div>

              <div class="profile-section">
                <button type="button" class="profile-item" role="menuitem" @click="profileOpen = false">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12v10H10l-3 3v-3H4z"/><path d="M10 7v4M8 9h4"/></svg>
                  <span>Give feedback</span>
                </button>
                <button type="button" class="profile-item" role="menuitem" @click="profileOpen = false">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M8.5 8a1.7 1.7 0 1 1 2 1.6c-.6.2-1 .7-1 1.4"/><circle cx="9.5" cy="14" r="0.6" fill="currentColor" stroke="none"/></svg>
                  <span>Get help</span>
                </button>
                <button type="button" class="profile-item" role="menuitem" @click="profileOpen = false">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z"/></svg>
                  <span>EMEA/EN</span>
                </button>
              </div>

              <div class="profile-section">
                <button type="button" class="profile-item" role="menuitem" @click="logout">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v12h4"/><path d="M12 7l3 3-3 3M15 10H8"/></svg>
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </nav>
    </header>
    </div>

    <TopStepNav v-if="showStepNav" />

    <main class="site-main" :class="{ 'with-panel': panelsOpen, 'with-chat': chatDockOpen }">
      <slot />
    </main>

    <aside v-if="panelsOpen" class="side-panel">
      <SyncPanel />
    </aside>

    <ChatDock v-if="user && featureFlags.isOn('chatbot')" />
    <GuidedHighlight v-if="user && featureFlags.isOn('chatbot') && featureFlags.isOn('guided_pass')" />
    <LearnModeOverlay />
    <ToastStack />

    <footer class="site-footer">
      <div class="footer-left">
        <!-- Logo doubles as the admin entry — click navigates to /admin. -->
        <NuxtLink to="/admin" class="footer-logo-link" aria-label="Admin">
          <GuentnerLogo />
        </NuxtLink>
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
  /* Width of the ChatDock drawer + approximate header height. Both are
     consumed by .site-main.with-chat and by the drawer's CSS. */
  --chat-drawer-w: 733px;
  --header-h: 68px;
  /* Perspective accent — 3-Ebenen-Farbcode am oberen Rand. */
  --perspective-accent: var(--c-brand-blue);
  border-top: 3px solid var(--perspective-accent);
  transition: border-top-color 0.2s ease;
}
/* Data-perspective attribute on .app-shell (set in template above) drives
   the accent color of the top bar. Same values as PerspectiveSwitcher. */
.app-shell[data-perspective='technical']   { --perspective-accent: var(--c-primary, #003865); }
.app-shell[data-perspective='application'] { --perspective-accent: var(--c-process, #0078BE); }
.app-shell[data-perspective='location']    { --perspective-accent: var(--c-site, #5B8C5A); }

/* Header-mounted PerspectiveSwitcher — a bit smaller than the default. */
.header-perspective { flex-shrink: 0; }
.header-perspective :deep(.perspective-btn) {
  padding: 6px 10px;
  font-size: var(--font-3xs);
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
  text-decoration: none;
  color: inherit;
  transition: opacity 0.12s;
}
.logo-wrap:hover { opacity: 0.75; }
.logo-wrap:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 25%, transparent);
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

/* myTools dropdown */
.tools-menu { position: relative; }
.nav-link-tools {
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
}
.nav-link-tools--open {
  color: var(--c-text);
  background: color-mix(in srgb, var(--c-brand-blue) 8%, transparent);
  border-radius: var(--radius-md);
}
.tools-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 260px;
  padding: 6px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tools-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-xs);
  color: var(--c-text);
  text-decoration: none;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tools-item:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
}
.tools-item svg { flex-shrink: 0; color: var(--c-text-medium); transition: color 0.12s; }
.tools-item:hover svg { color: var(--c-brand-blue); }

.tools-drop-enter-active, .tools-drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.tools-drop-enter-from, .tools-drop-leave-to {
  opacity: 0; transform: translateY(-4px);
}

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
.profile-cluster { position: relative; }
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
.avatar-group:hover,
.avatar-group--open { background: var(--c-border); }

/* Profile dropdown menu — opens below the avatar, right-aligned */
.profile-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 40;
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 4px;
}
.profile-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--c-surface-alt);
  border-radius: var(--radius-xs);
}
.profile-avatar {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  letter-spacing: 0.1px;
  flex-shrink: 0;
}
.profile-head-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.profile-name {
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-text);
  line-height: 16px;
}
.profile-view {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-brand-blue);
  text-decoration: none;
  line-height: 15px;
}
.profile-view:hover { text-decoration: underline; }

.profile-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}
.profile-section + .profile-section {
  border-top: 1px solid var(--c-border-card);
}
.profile-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--c-text);
  text-decoration: none;
  text-align: left;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background 0.12s, color 0.12s;
  width: 100%;
}
.profile-item:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
}
.profile-item svg { flex-shrink: 0; color: var(--c-text-medium); transition: color 0.12s; }
.profile-item:hover svg { color: var(--c-brand-blue); }

.profile-drop-enter-active, .profile-drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.profile-drop-enter-from, .profile-drop-leave-to {
  opacity: 0; transform: translateY(-4px);
}
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
  transition: padding-right 0.24s ease;
}
.site-main.with-panel { padding-right: 340px; }
.site-main.with-chat { padding-right: var(--chat-drawer-w); }
.site-main.with-panel.with-chat { padding-right: calc(340px + var(--chat-drawer-w)); }

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
.footer-logo-link {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: var(--radius-xs);
  transition: opacity 0.12s, background 0.12s;
}
.footer-logo-link:hover { opacity: 0.7; }
.footer-logo-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 25%, transparent);
}
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
