<script setup lang="ts" generic="T extends Record<string, any>">
/**
 * DataTable — generic table with columns config + row slot.
 *
 * Consumers pass an array of rows and a `columns` array. For custom
 * cells, use the `#cell-{key}` slot. Provides built-in empty/loading
 * states, but pagination and sorting are left to callers (composable
 * table state kept simple until we need it in more than one place).
 */

interface Column<T> {
  /** Column key — used for the `#cell-{key}` slot name and, as a
   *  fallback, for `row[key]` value access. Not required to be a real
   *  key of T so consumers can add pseudo-columns (checkbox, actions). */
  key: string
  label: string
  /** Optional CSS width, e.g. '160px' or '1fr'. */
  width?: string
  /** Cell alignment. */
  align?: 'left' | 'center' | 'right'
}

const props = defineProps<{
  rows: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  /** Optional row-key. Defaults to `id` if present, else the row index. */
  rowKey?: (row: T, i: number) => string | number
}>()

function keyFor(row: T, i: number): string | number {
  if (props.rowKey) return props.rowKey(row, i)
  return (row.id as any) ?? i
}
</script>

<template>
  <div class="data-table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th
            v-for="c in columns"
            :key="c.key"
            :style="{ width: c.width, textAlign: c.align || 'left' }"
          >{{ c.label }}</th>
          <th v-if="$slots.actions" class="data-table-actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="data-table-state">
          <td :colspan="columns.length + ($slots.actions ? 1 : 0)">Loading…</td>
        </tr>
        <tr v-else-if="!rows.length" class="data-table-state">
          <td :colspan="columns.length + ($slots.actions ? 1 : 0)">
            {{ emptyMessage || 'Keine Einträge.' }}
          </td>
        </tr>
        <tr v-else v-for="(row, i) in rows" :key="keyFor(row, i)">
          <td
            v-for="c in columns"
            :key="c.key"
            :style="{ textAlign: c.align || 'left' }"
          >
            <slot :name="`cell-${c.key}`" :row="row" :value="(row as any)[c.key]">{{ (row as any)[c.key] }}</slot>
          </td>
          <td v-if="$slots.actions" class="data-table-actions">
            <slot name="actions" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table-wrap {
  overflow-x: auto;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
}
.data-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 500;
  color: var(--c-text-medium);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg);
}
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border-card);
  vertical-align: middle;
}
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover td { background: color-mix(in srgb, var(--c-brand-blue) 3%, transparent); }
.data-table-state td {
  text-align: center;
  padding: 32px 16px;
  color: var(--c-text-light2);
}
.data-table-actions {
  text-align: right;
  white-space: nowrap;
}
.data-table-actions-col { width: 1px; }
</style>
