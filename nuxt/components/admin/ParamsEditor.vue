<script setup lang="ts">
/**
 * ParamsEditor — Chip-Liste + Add-Dropdown für Store-Params.
 *
 * v-model:params = Record<string, unknown>
 * Jeder Schlüssel muss in ENTRY_PARAM_FIELDS existieren, sonst wird der
 * Chip zwar angezeigt (mit ⚠ Icon), aber der User kann ihn nur löschen —
 * nicht editieren. So bleiben verwaiste Params sichtbar statt still
 * verschwinden zu lassen.
 */
import { computed, ref } from 'vue'
import {
  ENTRY_PARAM_FIELDS,
  findEntryParamField,
  type EntryParamFieldDef
} from '~/data/entryParamFields'

const props = defineProps<{
  params: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:params', v: Record<string, unknown>): void
}>()

// Add-Widget State
const addOpen = ref(false)
const pendingFieldId = ref<string>('')
const pendingValue = ref<any>(null)

const availableFields = computed<EntryParamFieldDef[]>(() =>
  ENTRY_PARAM_FIELDS.filter(f => !(f.id in props.params))
)

const pendingField = computed<EntryParamFieldDef | null>(() =>
  pendingFieldId.value ? findEntryParamField(pendingFieldId.value) : null
)

function startAdd() {
  addOpen.value = true
  pendingFieldId.value = availableFields.value[0]?.id || ''
  pendingValue.value = null
}

function cancelAdd() {
  addOpen.value = false
  pendingFieldId.value = ''
  pendingValue.value = null
}

// Sensible Defaults bei Feld-Auswahl setzen
function onFieldPick() {
  const field = pendingField.value
  if (!field) { pendingValue.value = null; return }
  if (field.type === 'number') pendingValue.value = 0
  else pendingValue.value = field.options[0]?.value ?? ''
}

function commitAdd() {
  const field = pendingField.value
  if (!field) return
  const value = field.type === 'number'
    ? Number(pendingValue.value)
    : String(pendingValue.value)
  if (field.type === 'number' && !Number.isFinite(value as number)) return
  if (field.type === 'enum' && !value) return
  emit('update:params', { ...props.params, [field.id]: value })
  cancelAdd()
}

function removeParam(key: string) {
  const next = { ...props.params }
  delete next[key]
  emit('update:params', next)
}

// Chip-Rendering: findet Label + Enum-Rendering
function chipFor(key: string, value: unknown) {
  const field = findEntryParamField(key)
  if (!field) {
    return { label: key, valueLabel: String(value), unit: '', orphan: true }
  }
  if (field.type === 'enum') {
    const opt = field.options.find(o => o.value === value)
    return { label: field.label, valueLabel: opt?.label || String(value), unit: '', orphan: false }
  }
  return { label: field.label, valueLabel: String(value), unit: field.unit || '', orphan: false }
}
</script>

<template>
  <div class="params-editor">
    <div v-if="!Object.keys(params).length && !addOpen" class="empty">
      <span>No params set.</span>
    </div>

    <!-- Chips -->
    <div v-if="Object.keys(params).length" class="chip-list">
      <span
        v-for="(value, key) in params"
        :key="key"
        class="chip"
        :class="{ 'chip-orphan': chipFor(String(key), value).orphan }"
      >
        <span v-if="chipFor(String(key), value).orphan" class="chip-warn" title="Unknown field — remove or add it to entryParamFields.ts">⚠</span>
        <span class="chip-label">{{ chipFor(String(key), value).label }}:</span>
        <span class="chip-value">{{ chipFor(String(key), value).valueLabel }}</span>
        <span v-if="chipFor(String(key), value).unit" class="chip-unit">{{ chipFor(String(key), value).unit }}</span>
        <button type="button" class="chip-remove" :aria-label="`Remove ${key}`" @click="removeParam(String(key))">
          <svg viewBox="0 0 12 12" width="10" height="10"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
        </button>
      </span>
    </div>

    <!-- Add row -->
    <div v-if="addOpen" class="add-row">
      <select v-model="pendingFieldId" class="add-select" @change="onFieldPick">
        <option value="" disabled>— Pick a field —</option>
        <option v-for="f in availableFields" :key="f.id" :value="f.id">{{ f.label }}</option>
      </select>

      <template v-if="pendingField">
        <input
          v-if="pendingField.type === 'number'"
          v-model.number="pendingValue"
          type="number"
          class="add-input"
          :placeholder="pendingField.unit || 'value'"
        />
        <select v-else v-model="pendingValue" class="add-input">
          <option v-for="o in pendingField.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <span v-if="pendingField.type === 'number' && pendingField.unit" class="add-unit">{{ pendingField.unit }}</span>
      </template>

      <button type="button" class="btn btn-primary btn-sm" :disabled="!pendingField" @click="commitAdd">Add</button>
      <button type="button" class="btn btn-outline btn-sm" @click="cancelAdd">Cancel</button>
    </div>

    <button
      v-else
      type="button"
      class="btn btn-outline btn-sm"
      :disabled="!availableFields.length"
      :title="!availableFields.length ? 'All available fields are already set' : ''"
      @click="startAdd"
    >
      + Add Param
    </button>
  </div>
</template>

<style scoped>
.params-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.empty {
  color: var(--c-text-medium, #676377);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  font-style: italic;
}
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  border: 1px solid var(--c-border, #cfcdd6);
  border-radius: 999px;
  background: var(--c-surface-alt, #f5f4f0);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-value, #262326);
  line-height: 1;
}
.chip-orphan {
  background: color-mix(in srgb, var(--c-error, #B33A3A) 8%, white);
  border-color: color-mix(in srgb, var(--c-error, #B33A3A) 40%, transparent);
}
.chip-warn { color: var(--c-error, #B33A3A); }
.chip-label { color: var(--c-text-medium, #676377); }
.chip-value { font-weight: 500; }
.chip-unit { color: var(--c-text-medium, #676377); font-size: 0.9em; }
.chip-remove {
  border: none;
  background: transparent;
  padding: 2px 4px;
  border-radius: 999px;
  cursor: pointer;
  color: var(--c-text-medium, #676377);
  display: inline-flex;
  align-items: center;
}
.chip-remove:hover { background: var(--c-border-card, #e6e4ea); color: var(--c-error, #B33A3A); }

.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.add-select, .add-input {
  padding: 6px 8px;
  border: 1px solid var(--c-border-input, #a6a3ad);
  border-radius: 4px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  background: white;
  color: var(--c-text-value, #262326);
  min-width: 130px;
}
.add-input { min-width: 90px; }
.add-unit { color: var(--c-text-medium, #676377); font-size: var(--font-3xs, 12.81px); }

.btn-sm { padding: 6px 10px; font-size: var(--font-3xs, 12.81px); }
</style>
