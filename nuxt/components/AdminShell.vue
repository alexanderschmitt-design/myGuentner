<script setup lang="ts">
/**
 * AdminShell — left-rail sub-navigation for all /admin/* pages.
 *
 * The rail is a fixed list of the admin sub-sections. `NuxtLink` sets
 * the `router-link-active` class automatically for the current route.
 */

interface AdminLink {
  to: string
  label: string
  description?: string
}

const links: AdminLink[] = [
  { to: '/admin',                label: 'Overview' },
  { to: '/admin/documents',      label: 'Documents' },
  { to: '/admin/rag-settings',   label: 'RAG Settings' },
  { to: '/admin/rag-test',       label: 'RAG Test' },
  { to: '/admin/dms',            label: 'DMS' },
  { to: '/admin/system',         label: 'System' },
  { to: '/admin/users',          label: 'Users' },
  { to: '/admin/home-sections',  label: 'Home Sections' }
]
</script>

<template>
  <div class="admin-shell">
    <nav class="admin-rail" aria-label="Admin sections">
      <NuxtLink
        v-for="l in links"
        :key="l.to"
        :to="l.to"
        class="admin-rail-link"
        :exact-active-class="l.to === '/admin' ? 'is-active' : ''"
        active-class="is-active"
      >{{ l.label }}</NuxtLink>
    </nav>
    <div class="admin-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--space-6);
  max-width: 1400px;
  margin: 0 auto;
  align-items: flex-start;
}
.admin-rail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 8px;
  position: sticky;
  top: var(--space-5);
}
.admin-rail-link {
  display: block;
  padding: 10px 14px;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-medium);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.admin-rail-link:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 6%, transparent);
  color: var(--c-text);
}
.admin-rail-link.is-active {
  background: color-mix(in srgb, var(--c-brand-blue) 12%, transparent);
  color: var(--c-brand-blue);
  font-weight: 500;
}
.admin-content {
  min-width: 0;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }
  .admin-rail {
    position: static;
    flex-direction: row;
    overflow-x: auto;
  }
  .admin-rail-link { white-space: nowrap; }
}
</style>
