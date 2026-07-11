<script setup lang="ts">
/**
 * LeafScore — 5-leaf sustainability indicator.
 * Reference: top-right of the sub-toolbar in Thermodynamics + Unit Selection
 * layout PNGs, next to the "1.7" version indicator.
 *
 * Filled green leaves = eco/natural refrigerant score for the current config.
 */
const props = withDefaults(defineProps<{ score?: number; total?: number }>(), {
  score: 2,
  total: 5
})
</script>

<template>
  <span class="leaf-score" :aria-label="`${props.score} of ${props.total} sustainability`">
    <svg
      v-for="i in props.total"
      :key="i"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      :class="{ 'is-active': i <= props.score }"
    >
      <!-- Simple leaf silhouette -->
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
  gap: 3px;
}
.leaf-score svg { color: var(--c-border); }
.leaf-score svg.is-active { color: var(--c-leaf); }
</style>
