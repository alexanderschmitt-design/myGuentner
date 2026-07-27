<script setup lang="ts">
/**
 * ColHead — column header cell with optional sort/filter affordances.
 * Used by service-orders list to implement the MPD-13736 sort+filter matrix.
 */

const props = defineProps<{
  label: string
  sortable?: boolean
  filterable?: boolean
  sortDir?: 'asc' | 'desc' | null
  filterActive?: boolean
}>()

const emit = defineEmits<{
  (e: 'sort'): void
  (e: 'filter'): void
}>()
</script>

<template>
  <div class="col-head" :class="{ 'is-sorted': !!sortDir, 'is-filtered': filterActive }">
    <button
      type="button"
      class="col-label"
      :class="{ 'col-label--clickable': sortable }"
      @click="sortable && emit('sort')"
    >
      <span>{{ label }}</span>
      <span
        v-if="sortable"
        class="col-sort"
        :class="`col-sort--${sortDir ?? 'idle'}`"
        aria-hidden="true"
      />
    </button>
    <button
      v-if="filterable"
      type="button"
      class="col-filter-btn"
      :class="{ 'is-active': filterActive }"
      aria-label="Column filter"
      @click.stop="emit('filter')"
    >
      <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1.5 2h11l-4 5v4l-3 1V7z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.col-head {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.col-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: default;
  min-width: 0;
}
.col-label--clickable { cursor: pointer; }
.col-label--clickable:hover { color: var(--c-text-value); }

.col-sort {
  display: inline-block;
  width: 8px;
  height: 10px;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.5;
  flex-shrink: 0;
}
.col-sort--idle {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 0l3 3H1zM4 10l3-3H1z' fill='%23878391'/></svg>");
}
.col-sort--asc {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 0l3 3H1z' fill='%23262326'/></svg>");
  opacity: 1;
}
.col-sort--desc {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 10l3-3H1z' fill='%23262326'/></svg>");
  opacity: 1;
}

.col-filter-btn {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-light);
  border-radius: var(--radius-xs2);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.col-filter-btn:hover { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); color: var(--c-brand-blue); }
.col-filter-btn.is-active {
  color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
}
.col-filter-btn.is-active svg { fill: currentColor; }
</style>
