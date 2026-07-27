<script setup lang="ts">
/**
 * ProfileSidebar — persistent profile menu shown on all /account/* pages.
 * Mirrors the profile dropdown from the header. The `active` prop marks the
 * current subpage; supported values match the menu-item ids below.
 */

type SidebarItem = 'profile' | 'companies' | 'sales-orders' | 'service-orders' | 'feedback' | 'help'
defineProps<{ active?: SidebarItem }>()

const user = useSupabaseUser()

function initials(email: string | null | undefined): string {
  if (!email) return '??'
  const name = email.split('@')[0]
  const parts = name.split(/[.\-_]/).filter(Boolean)
  const first = parts[0]?.[0] || name[0] || '?'
  const second = parts[1]?.[0] || name[1] || ''
  return (first + second).toUpperCase()
}
function displayName(email: string | null | undefined): string {
  if (!email) return 'Andrew Schofield'
  const local = email.split('@')[0]
  const parts = local.split(/[.\-_]/).filter(Boolean)
  if (parts.length < 2) return local.charAt(0).toUpperCase() + local.slice(1)
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

const supabase = useSupabaseClient()
async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <aside class="profile-sidebar">
    <div class="sidebar-menu">
      <div class="profile-head">
        <span class="profile-avatar">{{ initials(user?.email) }}</span>
        <span class="profile-head-text">
          <span class="profile-name">{{ displayName(user?.email) }}</span>
          <NuxtLink to="/account" class="profile-view">View profile</NuxtLink>
        </span>
      </div>

      <div class="menu-section">
        <NuxtLink to="/account" class="menu-item" :class="{ 'is-active': active === 'profile' }">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>
          <span>Personal information</span>
        </NuxtLink>
        <a href="#companies" class="menu-item" :class="{ 'is-active': active === 'companies' }">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12v9H4z"/><path d="M8 6V4h4v2"/><path d="M4 10h12"/></svg>
          <span>Companies</span>
        </a>
        <a href="#sales" class="menu-item" :class="{ 'is-active': active === 'sales-orders' }">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h8l2 2v12H5z"/><path d="M8 8h6M8 11h4"/><circle cx="14.5" cy="13" r="1.4"/></svg>
          <span>Sales orders</span>
        </a>
        <NuxtLink to="/account/service-orders" class="menu-item" :class="{ 'is-active': active === 'service-orders' }">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="14" rx="1"/><path d="M8 8l1 1 3-3M8 13l1 1 3-3"/></svg>
          <span>Service orders</span>
        </NuxtLink>
      </div>

      <div class="menu-section">
        <a href="#feedback" class="menu-item" :class="{ 'is-active': active === 'feedback' }">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12v10H10l-3 3v-3H4z"/><path d="M10 7v4M8 9h4"/></svg>
          <span>Give feedback</span>
        </a>
        <a href="#help" class="menu-item" :class="{ 'is-active': active === 'help' }">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M8.5 8a1.7 1.7 0 1 1 2 1.6c-.6.2-1 .7-1 1.4"/><circle cx="9.5" cy="14" r="0.6" fill="currentColor" stroke="none"/></svg>
          <span>Get help</span>
        </a>
      </div>

      <div class="menu-section">
        <button type="button" class="menu-item" @click="logout">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v12h4"/><path d="M12 7l3 3-3 3M15 10H8"/></svg>
          <span>Log out</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.profile-sidebar { position: sticky; top: var(--space-md); }
.sidebar-menu {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--c-surface-alt);
  border-radius: var(--radius-xs);
  margin: 0 0 4px;
}
.profile-avatar {
  width: 44px; height: 44px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
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
}
.profile-view:hover { text-decoration: underline; }

.menu-section { display: flex; flex-direction: column; gap: 2px; padding: 4px 0; }
.menu-section + .menu-section { border-top: 1px solid var(--c-border-card); }
.menu-item {
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
.menu-item:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
}
.menu-item.is-active {
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  color: var(--c-brand-blue);
  font-weight: 500;
}
.menu-item svg { flex-shrink: 0; color: var(--c-text-medium); transition: color 0.12s; }
.menu-item:hover svg,
.menu-item.is-active svg { color: var(--c-brand-blue); }
</style>
