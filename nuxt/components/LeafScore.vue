<script setup lang="ts">
/**
 * LeafScore — impact-rating leaves as seen in Figma node 2328:7827
 * (sub-toolbar right side, next to "1.7" numeric prefix).
 *
 * Active leaves use --c-impact-green (#00c897); inactive fall back to the
 * standard border grey. Optional score-label renders a small numeric prefix
 * matching the "1.7" example from Figma.
 */
const props = withDefaults(defineProps<{
  score?: number
  total?: number
  scoreLabel?: string | number | null
}>(), {
  score: 2,
  total: 5,
  scoreLabel: null
})
</script>

<template>
  <span class="leaf-score" :aria-label="`${props.score} of ${props.total} sustainability`">
    <span v-if="props.scoreLabel !== null" class="score-label">{{ props.scoreLabel }}</span>
    <svg
      v-for="i in props.total"
      :key="i"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      :class="{ 'is-active': i <= props.score }"
    >
      <!-- Leaf silhouette — filled when active -->
      <path
        d="M12 3C7 3 4 7 4 12c0 4 3 8 8 9 5-1 8-5 8-9 0-5-3-9-8-9z M12 6c-3 2-5 5-5 8 1 0 3-1 5-3 2-2 3-4 3-5-1 0-2 0-3 0z"
        fill="currentColor"
      />
    </svg>
  </span>
</template>

<style scoped>
.leaf-score {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);   /* 5px */
}
.score-label {
  font-family: var(--font-ui);
  font-size: var(--font-sm-base);       /* 17.38px */
  line-height: var(--lh-sm);            /* 24px */
  color: var(--c-text-dark2);           /* #48445a */
  letter-spacing: 0.1px;
  margin-right: var(--space-xs4);       /* 3px */
}
.leaf-score svg { color: var(--c-border); }
.leaf-score svg.is-active { color: var(--c-impact-green); }
</style>
