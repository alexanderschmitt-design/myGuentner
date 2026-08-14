<script setup lang="ts">
/**
 * ImpactSelect — custom dropdown with Impact° icons per option.
 *
 * Renders a native-select-shaped combobox that:
 *   • shows a leading green icon inside the combobox when the currently
 *     selected option has `hasImpact: true`
 *   • renders each option's icon in the popup list when the option has
 *     `hasImpact: true` (native <select> can't do this)
 *   • has a persistent trailing icon-button that opens the Impact° explainer
 *     modal — emit `impact-info` and the parent handles the modal
 *
 * Keyboard: ArrowDown opens & moves highlight, Arrow/Enter/Escape as usual.
 * Click-outside closes. Values are opaque — component doesn't care whether
 * they're strings or numbers.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

export interface ImpactSelectOption {
  value: string | number
  label: string
  hasImpact?: boolean
}

const props = defineProps<{
  modelValue: string | number | null | undefined
  options: readonly ImpactSelectOption[]
  disabled?: boolean
  /** Aria-label for the trailing impact-info button. */
  impactAriaLabel?: string
  /** When false, hide the trailing Impact° info button (rare — most callers
   *  want it because the icon is what makes this component distinct). */
  showTrailingImpactButton?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number): void
  /** User clicked the trailing Impact° icon — parent should open the modal. */
  (e: 'impact-info'): void
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const highlight = ref(0)

const selectedOpt = computed(() =>
  props.options.find((o) => o.value === props.modelValue) ?? null
)
const selectedHasImpact = computed(() => selectedOpt.value?.hasImpact === true)
const selectedLabel = computed(() => selectedOpt.value?.label ?? '')
const showTrailing = computed(() => props.showTrailingImpactButton !== false)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    const idx = props.options.findIndex((o) => o.value === props.modelValue)
    highlight.value = idx >= 0 ? idx : 0
    nextTick(scrollHighlightIntoView)
  }
}

function scrollHighlightIntoView() {
  const list = rootEl.value?.querySelector('.imp-list')
  const item = list?.querySelectorAll('.imp-opt')?.[highlight.value] as HTMLElement | undefined
  item?.scrollIntoView({ block: 'nearest' })
}

function select(v: string | number) {
  emit('update:modelValue', v)
  open.value = false
}

function onKey(e: KeyboardEvent) {
  if (props.disabled) return
  if (!open.value) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      toggle()
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlight.value = Math.min(props.options.length - 1, highlight.value + 1)
    scrollHighlightIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlight.value = Math.max(0, highlight.value - 1)
    scrollHighlightIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = props.options[highlight.value]
    if (opt) select(opt.value)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const el = rootEl.value
  if (el && !el.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div class="imp-select" :class="{ 'is-disabled': disabled }" ref="rootEl">
    <div
      class="imp-combo"
      :class="{ 'is-open': open }"
      role="combobox"
      :tabindex="disabled ? -1 : 0"
      :aria-expanded="open"
      :aria-disabled="disabled"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onKey"
    >
      <img
        v-if="selectedHasImpact"
        src="/icons/icon_impact.svg"
        class="imp-combo-leading"
        alt=""
      />
      <span class="imp-combo-label">{{ selectedLabel }}</span>
      <svg
        class="imp-combo-chevron"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>

    <ul v-if="open" class="imp-list" role="listbox">
      <li
        v-for="(o, i) in options"
        :key="String(o.value)"
        class="imp-opt"
        :class="{
          'is-selected': o.value === modelValue,
          'is-highlight': i === highlight
        }"
        role="option"
        :aria-selected="o.value === modelValue"
        @mousedown.prevent="select(o.value)"
        @mousemove="highlight = i"
      >
        <img
          v-if="o.hasImpact"
          src="/icons/icon_impact.svg"
          class="imp-opt-icon"
          alt=""
        />
        <span v-else class="imp-opt-icon-placeholder" aria-hidden="true"></span>
        <span class="imp-opt-label">{{ o.label }}</span>
      </li>
    </ul>

    <button
      v-if="showTrailing"
      type="button"
      class="imp-trailing"
      :aria-label="impactAriaLabel || 'Impact° label — learn more'"
      :disabled="disabled"
      @click="emit('impact-info')"
    >
      <img src="/icons/icon_impact.svg" alt="" />
    </button>
  </div>
</template>

<style scoped>
.imp-select {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-a8);
  width: 100%;
}
.imp-select.is-disabled { opacity: 0.55; pointer-events: none; }

.imp-combo {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: var(--lh-xs);
  color: var(--c-text-value);
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.imp-combo:focus,
.imp-combo.is-open {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.imp-combo-leading { width: 18px; height: 18px; flex-shrink: 0; display: block; }
.imp-combo-label {
  flex: 1 0 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.imp-combo-chevron {
  color: var(--c-text-medium);
  flex-shrink: 0;
  transition: transform 0.15s;
}
.imp-combo.is-open .imp-combo-chevron { transform: rotate(180deg); }

/* Options list — absolutely positioned under the combobox */
.imp-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 38px;  /* leave room for the trailing impact button (~26px + 8px gap) */
  z-index: 20;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-height: 320px;
  overflow-y: auto;
}
.imp-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  cursor: pointer;
}
.imp-opt.is-highlight { background: color-mix(in srgb, var(--c-brand-blue) 6%, white); }
.imp-opt.is-selected  { background: color-mix(in srgb, var(--c-brand-blue) 10%, white); font-weight: 500; }
.imp-opt-icon { width: 16px; height: 16px; display: block; flex-shrink: 0; }
.imp-opt-icon-placeholder { width: 16px; height: 16px; flex-shrink: 0; }
.imp-opt-label {
  flex: 1 0 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Trailing Impact° button */
.imp-trailing {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.imp-trailing:hover { background: color-mix(in srgb, var(--c-impact-green) 12%, transparent); }
.imp-trailing:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-impact-green) 25%, transparent); }
.imp-trailing img { width: 18px; height: 18px; display: block; }
.imp-trailing:disabled { cursor: not-allowed; opacity: 0.5; }
</style>
