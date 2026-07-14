<script setup lang="ts">
/**
 * UnitValueInput — number input with a clickable unit chip.
 *
 * Clicking the chip opens a dropdown that lists the current value converted
 * into every unit for the field's quantity (temperature, pressure, …).
 * Selecting a different unit switches only the DISPLAY unit — the emitted
 * `modelValue` always stays in the field's declared base unit (`unit`
 * prop), so switching units and switching back is loss-free.
 *
 * Typing keeps the same invariant: whatever the user enters in the current
 * display unit is converted back into the base unit before being emitted.
 */

import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import {
  QUANTITIES,
  convert,
  findUnit,
  roundToDecimals,
  type QuantityId,
  type UnitDef
} from '~/composables/useUnitConversion'

const props = defineProps<{
  modelValue: number | null
  /** The unit `modelValue` is expressed in — the field's canonical base. */
  unit: string
  quantity: QuantityId
  step?: number | string
  disabled?: boolean
  placeholder?: string
  /** ARIA-friendly label for the unit toggle (falls back to unit label). */
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: number | null): void
}>()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)

// Local display unit — starts as the base unit and diverges only per user
// preference. Re-syncs if the parent ever changes `unit` (rare).
const displayUnit = ref<string>(props.unit)
watch(() => props.unit, u => { displayUnit.value = u })

const units = computed<UnitDef[]>(() => QUANTITIES[props.quantity].units)
const currentUnitDef = computed<UnitDef | undefined>(() =>
  findUnit(props.quantity, displayUnit.value))

const displayValue = computed<string>(() => {
  if (props.modelValue == null || Number.isNaN(props.modelValue)) return ''
  if (!currentUnitDef.value) return String(props.modelValue)
  const converted = convert(props.modelValue, props.unit, displayUnit.value, props.quantity)
  return roundToDecimals(converted, currentUnitDef.value.decimals).toString()
})

function formatForUnit(u: UnitDef): string {
  if (props.modelValue == null || Number.isNaN(props.modelValue)) return '—'
  const converted = convert(props.modelValue, props.unit, u.code, props.quantity)
  return roundToDecimals(converted, u.decimals).toString()
}

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '' || raw === '-') {
    emit('update:modelValue', null)
    return
  }
  const parsed = Number(raw)
  if (Number.isNaN(parsed)) return
  // Convert back from display unit → base unit, at full precision.
  const back = convert(parsed, displayUnit.value, props.unit, props.quantity)
  emit('update:modelValue', back)
}

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function selectUnit(code: string) {
  displayUnit.value = code
  isOpen.value = false
}

function onDocMouseDown(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node | null
  if (root.value && target && !root.value.contains(target)) {
    isOpen.value = false
  }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="unit-value-input" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <input
      type="number"
      :step="step"
      :value="displayValue"
      :disabled="disabled"
      :placeholder="placeholder"
      @input="onInput"
    />
    <button
      type="button"
      class="unit-chip"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :aria-label="ariaLabel || `Change unit (currently ${currentUnitDef?.label})`"
      :disabled="disabled"
      @click="toggleDropdown"
    >
      <span class="unit-chip-label">{{ currentUnitDef?.label || unit }}</span>
      <svg class="unit-caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="isOpen" class="unit-dropdown" role="listbox">
      <button
        v-for="u in units"
        :key="u.code"
        type="button"
        class="unit-option"
        :class="{ active: u.code === displayUnit }"
        role="option"
        :aria-selected="u.code === displayUnit"
        @click="selectUnit(u.code)"
      >
        <span class="unit-option-value">{{ formatForUnit(u) }}</span>
        <span class="unit-option-label">{{ u.label }}</span>
        <span class="unit-option-check" aria-hidden="true">
          <svg v-if="u.code === displayUnit" viewBox="0 0 12 12" width="12" height="12">
            <path d="M3 6.5l2 2 4-4.5" fill="none" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.unit-value-input {
  position: relative;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.unit-value-input:focus-within {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.unit-value-input.is-open {
  border-color: var(--c-brand-blue);
}
.unit-value-input.is-disabled {
  opacity: 0.6;
  background: var(--c-bg);
}

.unit-value-input input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  padding: 10px 12px;
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: var(--lh-xs);
  color: var(--c-text-value);
}
.unit-value-input input::-webkit-outer-spin-button,
.unit-value-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.unit-value-input input[type='number'] { -moz-appearance: textfield; }
.unit-value-input input:disabled { cursor: not-allowed; }

.unit-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  background: transparent;
  border: none;
  border-left: 1px solid var(--c-border-card);
  color: var(--c-text-light2);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.unit-chip:hover:not(:disabled) {
  background: var(--c-surface-alt);
  color: var(--c-text-value);
}
.unit-chip:disabled { cursor: not-allowed; }
.unit-chip-label { font-variant-numeric: tabular-nums; }
.unit-caret { flex-shrink: 0; }

.unit-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 176px;
  max-width: 260px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  z-index: 50;
  overflow: hidden;
}

.unit-option {
  display: grid;
  grid-template-columns: 1fr auto 16px;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  text-align: left;
  transition: background 0.1s;
}
.unit-option:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 6%, white);
}
.unit-option.active {
  color: var(--c-brand-blue);
  font-weight: 500;
}
.unit-option-value {
  font-variant-numeric: tabular-nums;
}
.unit-option-label {
  color: var(--c-text-light2);
}
.unit-option.active .unit-option-label {
  color: var(--c-brand-blue);
}
.unit-option-check {
  color: var(--c-brand-blue);
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 12px;
}
</style>
