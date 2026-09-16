<script setup lang="ts">
/**
 * ConfigQuestionCard — wiederverwendbare Guided-Q&A-Karte.
 *
 * Wird in ChatDock.vue für die Laufzeit-Darstellung verwendet und in
 * GuidedFlowEditor.vue für die Live-Vorschau (preview=true → Buttons inaktiv).
 * Beide Kontexte sehen dasselbe Markup und dieselben Styles.
 */
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { findChoiceIcon, FALLBACK_SVG_PATH } from '~/data/choiceIcons'

interface Suggestion {
  label: string
  detail?: string
  icon?: string
}

const props = withDefaults(defineProps<{
  message: string
  suggestions?: readonly Suggestion[]
  cardLabel?: string
  /** true im Admin-Editor: Buttons werden angezeigt aber nicht klickbar */
  preview?: boolean
}>(), {
  suggestions: () => [],
  cardLabel: 'CONFIGURATION QUESTION',
  preview: false,
})

const emit = defineEmits<{
  (e: 'suggest', idx: number): void
}>()

marked.setOptions({ breaks: true, gfm: true })

function renderedMessage(content: string): string {
  const raw = marked.parse(content || '') as string
  if (typeof window === 'undefined') return raw
  return DOMPurify.sanitize(raw)
}

function choiceIconSvg(iconKey?: string): string {
  const path = iconKey ? (findChoiceIcon(iconKey)?.svgPath ?? FALLBACK_SVG_PATH) : FALLBACK_SVG_PATH
  return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
}
</script>

<template>
  <div class="config-question-card">
    <div class="config-question-head">
      <svg class="config-question-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M8 1l1.3 3.7L13 6l-3.7 1.3L8 11 6.7 7.3 3 6l3.7-1.3L8 1zM13 10l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7L13 10z"/>
      </svg>
      <span class="config-question-label">{{ cardLabel }}</span>
    </div>

    <div class="config-question-body" v-html="renderedMessage(message)"></div>

    <div v-if="suggestions.length" class="config-choice-list">
      <button
        v-for="(s, idx) in suggestions"
        :key="s.label + idx"
        type="button"
        class="config-choice"
        :disabled="preview"
        @click="!preview && emit('suggest', idx)"
      >
        <span class="config-choice-icon" aria-hidden="true" v-html="choiceIconSvg(s.icon)"></span>
        <span class="config-choice-body">
          <span class="config-choice-label">{{ s.label || '…' }}</span>
          <span v-if="s.detail" class="config-choice-detail">{{ s.detail }}</span>
        </span>
        <span class="config-choice-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3l5 5-5 5"/>
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.config-question-card {
  padding: 14px 14px 12px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 7%, white);
  border: 1px solid color-mix(in srgb, var(--c-brand-blue, #0078BE) 20%, transparent);
  border-left: 4px solid var(--c-brand-blue, #0078BE);
  border-radius: 8px;
}
.config-question-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-brand-blue, #0078BE);
  margin-bottom: 8px;
}
.config-question-icon { flex-shrink: 0; }
.config-question-label {
  font-family: var(--font-ui, sans-serif);
  font-size: 11.58px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.config-question-body {
  font-family: var(--font-ui, sans-serif);
  font-size: 14.17px;
  font-weight: 600;
  color: var(--c-text-value, #262326);
  line-height: 1.4;
  margin-bottom: 12px;
}
.config-question-body :deep(p) { margin: 0 0 6px; }
.config-question-body :deep(p:last-child) { margin-bottom: 0; }
.config-question-body :deep(strong) { font-weight: 700; }
.config-choice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.config-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  width: 100%;
  background: white;
  border: 1px solid var(--c-border, #cfcdd6);
  border-radius: 4px;
  text-align: left;
  font-family: var(--font-ui, sans-serif);
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s, transform 0.06s;
}
.config-choice:hover:not(:disabled) {
  border-color: var(--c-brand-blue, #0078BE);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c-brand-blue, #0078BE) 12%, transparent);
}
.config-choice:active:not(:disabled) { transform: translateY(1px); }
.config-choice:disabled { cursor: default; }
.config-choice-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 10%, white);
  color: var(--c-brand-blue, #0078BE);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.config-choice-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.config-choice-label {
  font-size: 14.17px;
  font-weight: 600;
  color: var(--c-text-value, #262326);
  line-height: 1.3;
}
.config-choice-detail {
  font-size: 12.81px;
  color: var(--c-text-medium, #676377);
  line-height: 1.4;
}
.config-choice-chevron {
  flex-shrink: 0;
  color: var(--c-text-medium, #676377);
  display: inline-flex;
  transition: transform 0.12s, color 0.12s;
}
.config-choice:hover:not(:disabled) .config-choice-chevron {
  color: var(--c-brand-blue, #0078BE);
  transform: translateX(2px);
}
</style>
