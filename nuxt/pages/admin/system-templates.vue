<script setup lang="ts">
/**
 * /admin/system-templates — Curated Güntner-Templates verwalten.
 *
 * Zeigt alle Templates in der DB (auch fremder User) mit einem Toggle,
 * um sie zu System-Templates zu promoten. System-Templates erscheinen bei
 * allen authenticated Usern als ★-markierte Optionen in der Templates-
 * Modal + Recommendation-Card.
 *
 * Workflow: Admin erstellt Templates ganz normal über die Wizard-Seite
 * (Templates-Button in Thermodynamics / Unit Selection), dann promotet sie
 * hier auf System-Status.
 */
import { ref, computed, onMounted } from 'vue'
import { getCategoryBySlug } from '~/composables/useCategory'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — System Templates' })

interface AdminTemplate {
  id: string
  ownerId: string
  name: string
  categorySlug: string
  isDefaultForCategory: boolean
  isSystem: boolean
  visibility: 'private' | 'shared'
  configuration: any
  updatedAt: string
}

const toast = useToast()
const templates = ref<AdminTemplate[]>([])
const loading = ref(true)
const busy = ref<string | null>(null)   // Template-ID während PUT läuft
const showFilter = ref<'all' | 'system' | 'private'>('all')

const filtered = computed<AdminTemplate[]>(() => {
  if (showFilter.value === 'system') return templates.value.filter(t => t.isSystem)
  if (showFilter.value === 'private') return templates.value.filter(t => !t.isSystem)
  return templates.value
})

const stats = computed(() => ({
  total: templates.value.length,
  system: templates.value.filter(t => t.isSystem).length,
  private: templates.value.filter(t => !t.isSystem).length
}))

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; templates: AdminTemplate[]; error?: string }>('/api/admin/templates')
    if (!res.ok) throw new Error(res.error || 'Load failed')
    templates.value = res.templates
  } catch (err: any) {
    toast.error(err?.data?.error || err?.message || 'Failed to load templates')
  } finally {
    loading.value = false
  }
}

async function togglePromote(t: AdminTemplate) {
  busy.value = t.id
  try {
    const endpoint = t.isSystem
      ? `/api/admin/templates/${encodeURIComponent(t.id)}/unpromote`
      : `/api/admin/templates/${encodeURIComponent(t.id)}/promote`
    const res = await $fetch<{ ok: boolean; template: any; error?: string }>(endpoint, { method: 'PUT' })
    if (!res.ok) throw new Error(res.error || 'Failed')
    // In-place aktualisieren
    const idx = templates.value.findIndex(x => x.id === t.id)
    if (idx >= 0) {
      templates.value[idx] = { ...templates.value[idx], isSystem: res.template.is_system, visibility: res.template.visibility }
    }
    toast.success(res.template.is_system ? `Promoted "${t.name}" to system` : `Removed "${t.name}" from system`)
  } catch (err: any) {
    toast.error(err?.data?.error || err?.message || 'Toggle failed')
  } finally {
    busy.value = null
  }
}

function categoryLabel(slug: string): string {
  const cat = getCategoryBySlug(slug)
  return cat ? `${cat.title}${cat.sublabel ? ' ' + cat.sublabel : ''}` : slug
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function paramCount(cfg: any): number {
  if (!cfg?.parameters) return 0
  let n = 0
  for (const [, v] of Object.entries(cfg.parameters)) {
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'number' && !Number.isFinite(v)) continue
    n++
  }
  return n
}

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="System Templates"
      description="Als System markierte Templates erscheinen bei allen Usern in der Templates-Modal und in den Q&A-Recommendation-Karten mit ★-Badge. Templates werden über die normale Wizard-UI erstellt (Templates-Button auf Thermodynamics / Unit Selection) und hier promoted."
    >
      <template #actions>
        <button class="btn btn-outline" :disabled="loading" @click="load">Refresh</button>
      </template>
    </AdminPageHeader>

    <div class="stats-row">
      <div class="stat-pill">
        <span class="stat-label">Total</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-pill stat-pill-system">
        <span class="stat-label">★ System</span>
        <span class="stat-value">{{ stats.system }}</span>
      </div>
      <div class="stat-pill">
        <span class="stat-label">Private</span>
        <span class="stat-value">{{ stats.private }}</span>
      </div>
      <div class="filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: showFilter === 'all' }"
          @click="showFilter = 'all'"
        >All</button>
        <button
          class="filter-tab"
          :class="{ active: showFilter === 'system' }"
          @click="showFilter = 'system'"
        >System</button>
        <button
          class="filter-tab"
          :class="{ active: showFilter === 'private' }"
          @click="showFilter = 'private'"
        >Private</button>
      </div>
    </div>

    <div v-if="loading" class="empty">Loading templates…</div>
    <div v-else-if="!filtered.length" class="empty">
      No templates in this filter. Create some via the wizard's Templates button, then promote them here.
    </div>

    <table v-else class="tpl-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Params</th>
          <th>Updated</th>
          <th class="th-toggle">System</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in filtered" :key="t.id" :class="{ 'row-system': t.isSystem }">
          <td>
            <strong>{{ t.name }}</strong>
            <span v-if="t.isDefaultForCategory" class="badge" title="Marked as private default by its owner">Default</span>
          </td>
          <td>
            <span class="cat-chip">{{ categoryLabel(t.categorySlug) }}</span>
          </td>
          <td>{{ paramCount(t.configuration) }}</td>
          <td>{{ fmtDate(t.updatedAt) }}</td>
          <td class="td-toggle">
            <button
              class="btn"
              :class="t.isSystem ? 'btn-primary' : 'btn-outline'"
              :disabled="busy === t.id"
              @click="togglePromote(t)"
            >
              <span v-if="t.isSystem">★ System</span>
              <span v-else>Promote</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.stats-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 16px 0 20px;
  flex-wrap: wrap;
}
.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--c-surface-alt);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
}
.stat-pill-system {
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  border-color: color-mix(in srgb, var(--c-brand-blue) 30%, transparent);
  color: var(--c-brand-blue);
}
.stat-label { color: var(--c-text-medium); }
.stat-pill-system .stat-label { color: var(--c-brand-blue); }
.stat-value { font-weight: 600; color: var(--c-text-value); }
.stat-pill-system .stat-value { color: var(--c-brand-blue); }

.filter-tabs {
  margin-left: auto;
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--c-surface-alt);
  border-radius: 999px;
}
.filter-tab {
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.filter-tab:hover { color: var(--c-text-value); }
.filter-tab.active {
  background: white;
  color: var(--c-brand-blue);
  font-weight: 500;
}

.empty {
  padding: 40px 20px;
  text-align: center;
  background: white;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
  color: var(--c-text-medium);
}

.tpl-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.tpl-table th, .tpl-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--c-border-card);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
}
.tpl-table th {
  background: var(--c-surface-alt);
  color: var(--c-text-medium);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tpl-table tr:last-child td { border-bottom: none; }
.tpl-table td strong { color: var(--c-text-value); font-weight: 500; }

.row-system {
  background: color-mix(in srgb, var(--c-brand-blue) 4%, white);
}

.badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 8px;
  background: var(--c-surface-alt);
  border: 1px solid var(--c-border);
  border-radius: 999px;
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
  font-weight: 400;
}
.cat-chip {
  display: inline-block;
  padding: 2px 8px;
  background: var(--c-surface-alt);
  border-radius: 3px;
  color: var(--c-text-value);
}
.th-toggle { width: 130px; text-align: right; }
.td-toggle { text-align: right; }
.td-toggle .btn {
  padding: 6px 12px;
  font-size: var(--font-3xs, 12.81px);
  min-width: 110px;
}
</style>
