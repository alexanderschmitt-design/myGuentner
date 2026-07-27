<script setup lang="ts">
/**
 * /projects — myProjects portal page.
 *
 * Layout mirrors Figma file WHGL55cJW0T7FwpmczbwB0, node 4607:13377:
 *   Header    — PROJECTS title + search + "Create a new project" button
 *   Filter    — All Projects / My projects / Shared with me tabs
 *   Grid      — 4-column card grid; each card has title, kebab menu,
 *               and a "N Products" pill at the bottom
 */

import { useProjectsData } from '~/composables/useProjectsData'
import type { Project, ProjectFilter } from '~/composables/useProjectsData'

useHead({ title: 'myGüntner — Projects' })

const router = useRouter()
const { projects: PROJECTS } = useProjectsData()

const activeFilter = ref<ProjectFilter>('all')
const search = ref('')

const filteredProjects = computed(() => {
  const q = search.value.trim().toLowerCase()
  return PROJECTS.filter(p => {
    if (activeFilter.value === 'mine'   && p.ownerId !== 'me')     return false
    if (activeFilter.value === 'shared' && p.ownerId !== 'shared') return false
    if (q && !p.title.toLowerCase().includes(q)) return false
    return true
  })
})

function createProject() { /* wire to backend when the projects API lands */ }
function openProject(p: Project) { router.push(`/projects/${p.id}`) }
function openMenu(_p: Project, e: MouseEvent) {
  e.stopPropagation()
  /* menu popover — pending */
}
</script>

<template>
  <div class="projects">
    <header class="proj-header">
      <h1 class="headline headline--section">PROJECTS</h1>
      <div class="proj-actions">
        <label class="proj-search">
          <span class="proj-search-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="9" r="6"/>
              <line x1="13.5" y1="13.5" x2="17" y2="17"/>
            </svg>
          </span>
          <input v-model="search" type="search" placeholder="Search" aria-label="Search projects" />
        </label>
        <button type="button" class="btn-create" @click="createProject">
          <span>Create a new project</span>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h10M11 6l4 4-4 4"/></svg>
        </button>
      </div>
    </header>

    <nav class="proj-tabs" role="tablist" aria-label="Project filter">
      <button
        type="button"
        role="tab"
        class="proj-tab"
        :class="{ active: activeFilter === 'all' }"
        :aria-selected="activeFilter === 'all'"
        @click="activeFilter = 'all'"
      >All Projects</button>
      <button
        type="button"
        role="tab"
        class="proj-tab"
        :class="{ active: activeFilter === 'mine' }"
        :aria-selected="activeFilter === 'mine'"
        @click="activeFilter = 'mine'"
      >My projects</button>
      <button
        type="button"
        role="tab"
        class="proj-tab"
        :class="{ active: activeFilter === 'shared' }"
        :aria-selected="activeFilter === 'shared'"
        @click="activeFilter = 'shared'"
      >Shared with me</button>
    </nav>

    <section class="proj-grid" role="tabpanel">
      <article
        v-for="p in filteredProjects"
        :key="p.id"
        class="proj-card"
        tabindex="0"
        @click="openProject(p)"
        @keydown.enter="openProject(p)"
      >
        <header class="proj-card-head">
          <h3 class="proj-card-title">{{ p.title }}</h3>
          <button type="button" class="proj-card-menu" aria-label="Project actions" @click="openMenu(p, $event)">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="3" r="1.4"/>
              <circle cx="8" cy="8" r="1.4"/>
              <circle cx="8" cy="13" r="1.4"/>
            </svg>
          </button>
        </header>
        <footer class="proj-card-foot">
          <span class="proj-count-pill">{{ p.items.length }} Products</span>
        </footer>
      </article>

      <p v-if="!filteredProjects.length" class="proj-empty">No projects match your filter.</p>
    </section>
  </div>
</template>

<style scoped>
.projects {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.proj-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}
.headline {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  color: var(--c-text);
  line-height: 100%;
}
.headline--section { font-size: var(--font-4xl); }

.proj-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}
.proj-search {
  display: inline-flex;
  align-items: center;
  gap: var(--space-a8);
  padding: 0 var(--space-a8) 0 var(--space-xs);
  height: 34px;
  min-width: 240px;
  background: var(--c-nav-search-bg);
  border-radius: var(--radius-xs);
}
.proj-search-icon { color: var(--c-nav-search-trailing); display: inline-flex; }
.proj-search input {
  flex: 1 0 0;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
}
.proj-search input::placeholder { color: var(--c-nav-search-text); }

.btn-create {
  display: inline-flex;
  align-items: center;
  gap: var(--space-a8);
  padding: 8px 14px;
  height: 34px;
  background: transparent;
  border: 1px solid var(--c-brand-blue);
  border-radius: var(--radius-xs);
  color: var(--c-brand-blue);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition: background 0.12s;
}
.btn-create:hover { background: color-mix(in srgb, var(--c-brand-blue) 6%, transparent); }

/* --------- Tabs --------- */
.proj-tabs {
  display: flex;
  gap: var(--space-md);
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 0;
}
.proj-tab {
  position: relative;
  padding: var(--space-xs2) 0;
  border: none;
  background: transparent;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: 16px;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition: color 0.12s;
}
.proj-tab:hover { color: var(--c-text); }
.proj-tab.active { color: var(--c-text); font-weight: 500; }
.proj-tab.active::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 2px;
  background: var(--c-accent-primary);
  border-radius: 2px;
}

/* --------- Grid --------- */
.proj-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-sm);
}
@media (max-width: 1200px) { .proj-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px)  { .proj-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px)  { .proj-grid { grid-template-columns: 1fr; } }

.proj-card {
  position: relative;
  min-height: 156px;
  padding: var(--space-sm);
  background: var(--c-surface-alt);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-md);
  transition: border-color 0.12s, transform 0.12s, box-shadow 0.12s;
}
.proj-card:hover {
  border-color: var(--c-brand-blue);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(38, 102, 224, 0.08);
}
.proj-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 25%, transparent);
}

.proj-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-xs2);
}
.proj-card-title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: 18px;
  color: var(--c-text);
  font-weight: 500;
  letter-spacing: 0.1px;
  min-width: 0;
  word-break: break-word;
}
.proj-card-menu {
  background: transparent;
  border: none;
  padding: 2px 4px;
  color: var(--c-text-medium);
  cursor: pointer;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
  transition: background 0.12s;
}
.proj-card-menu:hover { background: rgba(0,0,0,0.06); color: var(--c-text); }

.proj-card-foot { display: flex; }
.proj-count-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}

.proj-empty {
  grid-column: 1 / -1;
  padding: var(--space-md);
  text-align: center;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
}
</style>
