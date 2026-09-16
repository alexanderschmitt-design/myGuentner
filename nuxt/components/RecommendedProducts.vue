<script setup lang="ts">
export interface RecommendationTemplate {
  id: string
  name: string
  categorySlug: string
  isDefaultForCategory: boolean
  isSystem: boolean
  isOwn: boolean
  configuration: any
  updatedAt: string
  paramCount: number
  matchScore?: number
  matchedFields?: string[]
}

export interface CrossCategoryInfo {
  templateName: string
  targetCategoryLabel: string
  sourceCategoryLabel: string
}

const props = defineProps<{
  templates: RecommendationTemplate[]
  loading: boolean
  introHtml: string
  crossCategory?: CrossCategoryInfo | null
}>()

const emit = defineEmits<{
  (e: 'pick', t: RecommendationTemplate): void
  (e: 'skip'): void
  (e: 'crossConfirm'): void
  (e: 'crossCancel'): void
}>()

function matchCount(t: RecommendationTemplate): number {
  return t.matchedFields?.length ?? 0
}

function matchBadgeClass(t: RecommendationTemplate): string {
  const n = matchCount(t)
  if (n >= 3) return 'rec-badge-green'
  if (n === 2) return 'rec-badge-amber'
  return 'rec-badge-muted'
}
</script>

<template>
  <div class="rec-card">
    <div class="rec-card-head">
      <svg class="rec-card-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M8 1l1.3 3.7L13 6l-3.7 1.3L8 11 6.7 7.3 3 6l3.7-1.3L8 1zM13 10l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7L13 10z"/>
      </svg>
      <span class="rec-card-label">RECOMMENDED PRODUCTS</span>
    </div>

    <div class="rec-card-body" v-html="introHtml"></div>

    <div v-if="loading" class="rec-loading">Identifying matching products…</div>

    <div v-else-if="crossCategory" class="rec-cross-confirm">
      <p class="rec-cross-title">This template is for a different category</p>
      <p class="rec-cross-detail">
        <strong>{{ crossCategory.templateName }}</strong> is configured for
        <em>{{ crossCategory.targetCategoryLabel }}</em>,
        but your entry was
        <em>{{ crossCategory.sourceCategoryLabel }}</em>.
        Load it and switch to that category?
      </p>
      <div class="rec-cross-actions">
        <button type="button" class="config-action-btn" @click="emit('crossConfirm')">
          Load &amp; switch category
        </button>
        <button type="button" class="config-action-btn config-action-btn-muted" @click="emit('crossCancel')">
          Cancel
        </button>
      </div>
    </div>

    <div v-else-if="templates.length" class="rec-choice-list">
      <button
        v-for="t in templates"
        :key="t.id"
        type="button"
        class="rec-choice"
        @click="emit('pick', t)"
      >
        <span class="rec-choice-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 2L13 5v6L8 14 3 11V5L8 2z"/>
            <path d="M3 5l5 3 5-3M8 8v6"/>
          </svg>
        </span>
        <span class="rec-choice-body">
          <span class="rec-choice-name-row">
            <span class="rec-choice-name">{{ t.name }}</span>
            <span
              v-if="matchCount(t) > 0"
              class="rec-match-badge"
              :class="matchBadgeClass(t)"
              :title="`Matched parameters: ${t.matchedFields?.join(', ')}`"
            >{{ matchCount(t) }} match{{ matchCount(t) === 1 ? '' : 'es' }}</span>
            <span v-if="t.isSystem" class="rec-system-badge" title="Güntner-curated">★ SYSTEM</span>
          </span>
          <span class="rec-choice-detail">{{ t.paramCount }} parameter{{ t.paramCount === 1 ? '' : 's' }} pre-filled</span>
        </span>
        <span class="rec-choice-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3l5 5-5 5"/>
          </svg>
        </span>
      </button>
    </div>

    <div v-else class="rec-empty">
      <p class="rec-empty-title">No matching templates for your answers.</p>
      <p class="rec-empty-detail">Continue to Thermodynamics and configure the unit from scratch — your Q&amp;A values stay filled in.</p>
    </div>

    <div v-if="!crossCategory" class="rec-actions">
      <button type="button" class="rec-skip-btn" @click="emit('skip')">
        Skip to configure from scratch →
      </button>
    </div>
  </div>
</template>

<style scoped>
.rec-card {
  padding: 14px 14px 12px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 7%, white);
  border: 1px solid color-mix(in srgb, var(--c-brand-blue, #0078BE) 20%, transparent);
  border-left: 4px solid var(--c-brand-blue, #0078BE);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rec-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-brand-blue, #0078BE);
}
.rec-card-icon { flex-shrink: 0; }
.rec-card-label {
  font-family: var(--font-ui, sans-serif);
  font-size: 11.58px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rec-card-body {
  font-family: var(--font-ui, sans-serif);
  font-size: 14.17px;
  font-weight: 600;
  color: var(--c-text-value, #262326);
  line-height: 1.4;
}
.rec-card-body :deep(p) { margin: 0 0 6px; }
.rec-card-body :deep(p:last-child) { margin-bottom: 0; }
.rec-card-body :deep(strong) { font-weight: 700; }

.rec-loading {
  padding: 12px 14px;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  font-style: italic;
  text-align: center;
  background: white;
  border-radius: var(--radius-xs, 4px);
  border: 1px dashed color-mix(in srgb, var(--c-brand-blue, #0078BE) 25%, transparent);
}

.rec-cross-confirm {
  padding: 14px;
  background: color-mix(in srgb, var(--c-warning, #F5B800) 8%, white);
  border: 1px solid color-mix(in srgb, var(--c-warning, #F5B800) 45%, transparent);
  border-radius: var(--radius-xs, 4px);
  font-family: var(--font-ui);
}
.rec-cross-title {
  margin: 0 0 6px;
  font-size: var(--font-2xs, 14.17px);
  font-weight: 600;
  color: var(--c-text-value);
}
.rec-cross-detail {
  margin: 0 0 12px;
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium);
  line-height: 1.5;
}
.rec-cross-detail strong { color: var(--c-text-value); }
.rec-cross-detail em { font-style: normal; color: var(--c-brand-blue, #0078BE); font-weight: 500; }
.rec-cross-actions { display: flex; gap: 8px; }

.rec-choice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rec-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  width: 100%;
  background: white;
  border: 1px solid var(--c-border, #cfcdd6);
  border-radius: var(--radius-xs, 4px);
  text-align: left;
  font-family: var(--font-ui, sans-serif);
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s, transform 0.06s;
}
.rec-choice:hover {
  border-color: var(--c-brand-blue, #0078BE);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c-brand-blue, #0078BE) 12%, transparent);
}
.rec-choice:active { transform: translateY(1px); }

.rec-choice-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs, 4px);
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 10%, white);
  color: var(--c-brand-blue, #0078BE);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rec-choice-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.rec-choice-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.rec-choice-name {
  font-size: var(--font-2xs, 14.17px);
  font-weight: 600;
  color: var(--c-text-value, #262326);
  line-height: 1.3;
}
.rec-choice-detail {
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium, #676377);
  line-height: 1.4;
}

.rec-match-badge, .rec-system-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.rec-badge-green {
  background: color-mix(in srgb, var(--c-success, #2E7D4F) 14%, white);
  color: var(--c-success, #2E7D4F);
  border: 1px solid color-mix(in srgb, var(--c-success, #2E7D4F) 35%, transparent);
}
.rec-badge-amber {
  background: color-mix(in srgb, var(--c-warning, #F5B800) 18%, white);
  color: color-mix(in srgb, var(--c-warning, #F5B800) 70%, #5a4000);
  border: 1px solid color-mix(in srgb, var(--c-warning, #F5B800) 45%, transparent);
}
.rec-badge-muted {
  background: var(--c-surface-alt, #f2f0f5);
  color: var(--c-text-medium, #676377);
  border: 1px solid var(--c-border, #cfcdd6);
}
.rec-system-badge {
  background: var(--c-brand-blue, #0078BE);
  color: white;
}

.rec-choice-chevron {
  flex-shrink: 0;
  color: var(--c-text-medium, #676377);
  display: inline-flex;
  transition: transform 0.12s, color 0.12s;
}
.rec-choice:hover .rec-choice-chevron {
  color: var(--c-brand-blue, #0078BE);
  transform: translateX(2px);
}

.rec-empty {
  padding: 12px 14px;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  background: white;
  border-radius: var(--radius-xs, 4px);
  border: 1px dashed color-mix(in srgb, var(--c-brand-blue, #0078BE) 25%, transparent);
}
.rec-empty-title {
  margin: 0 0 4px;
  font-weight: 600;
  color: var(--c-text-value);
}
.rec-empty-detail { margin: 0; line-height: 1.5; }

.rec-actions {
  display: flex;
  justify-content: flex-start;
}
.rec-skip-btn {
  background: none;
  border: none;
  padding: 0;
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium, #676377);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: color 0.12s, text-decoration-color 0.12s;
}
.rec-skip-btn:hover {
  color: var(--c-brand-blue, #0078BE);
  text-decoration-color: currentColor;
}
</style>
