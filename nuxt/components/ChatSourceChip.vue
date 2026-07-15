<script setup lang="ts">
import type { RagSource } from '~/composables/useChatStream'

defineProps<{
  index: number
  source: RagSource
}>()

const emit = defineEmits<{ (e: 'open', src: RagSource): void }>()
</script>

<template>
  <button type="button" class="src-chip" :title="source.metadata?.documentName || ''" @click="emit('open', source)">
    <span class="src-chip-num">{{ index }}</span>
    <span class="src-chip-label">{{ source.metadata?.documentName || 'Quelle' }}</span>
  </button>
</template>

<style scoped>
.src-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 3px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: white;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
  max-width: 220px;
  transition: background 0.15s, border-color 0.15s;
}
.src-chip:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 6%, white);
  border-color: var(--c-brand-blue);
  color: var(--c-brand-blue);
}
.src-chip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--c-brand-blue);
  color: white;
  font-weight: 500;
  flex-shrink: 0;
}
.src-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
