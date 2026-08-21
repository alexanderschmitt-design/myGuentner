<script setup lang="ts">
/**
 * FileDropzone — drag/drop + click-to-pick single-file input.
 *
 * Emits `file` with the picked File (or `null` when the user clears).
 * Optional `maxSizeMb` prop enforces client-side size limit.
 */
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    accept?: string
    maxSizeMb?: number
    disabled?: boolean
    label?: string
  }>(),
  {
    accept: '.pdf,.docx,.xlsx,.txt,.md,.csv',
    maxSizeMb: 50,
    label: 'Datei hierher ziehen oder klicken zum Auswählen'
  }
)

const emit = defineEmits<{
  (e: 'file', f: File | null): void
  (e: 'error', message: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
/** Zähler für dragenter/dragleave — sonst blinkt der Highlight-State, weil
 *  dragleave auch feuert wenn der Cursor über ein Kind-Element wandert. */
let dragCounter = 0

function validate(f: File): string | null {
  if (props.maxSizeMb > 0 && f.size > props.maxSizeMb * 1024 * 1024) {
    return `Datei ist zu groß (max. ${props.maxSizeMb} MB)`
  }
  return null
}

function handleFile(f: File | null) {
  if (!f) {
    emit('file', null)
    return
  }
  const err = validate(f)
  if (err) {
    emit('error', err)
    return
  }
  emit('file', f)
}

function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  handleFile(el.files?.[0] || null)
  el.value = '' // reset so the same filename can be picked again
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter = 0
  isDragging.value = false
  if (props.disabled) return
  const f = e.dataTransfer?.files?.[0]
  if (f) handleFile(f)
  else emit('error', 'Kein Datei-Objekt im Drop — bitte Datei erneut aus dem Explorer ziehen.')
}

function onDragEnter(e: DragEvent) {
  if (props.disabled) return
  e.preventDefault()
  e.stopPropagation()
  dragCounter++
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter = Math.max(0, dragCounter - 1)
  if (dragCounter === 0) isDragging.value = false
}

function onDragOver(e: DragEvent) {
  // dragover muss IMMER preventDefault haben — sonst blockt Browser das
  // drop-Event ganz und die Datei wird stattdessen im Tab geöffnet.
  e.preventDefault()
  e.stopPropagation()
  if (props.disabled) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

function trigger() {
  if (props.disabled) return
  inputRef.value?.click()
}
</script>

<template>
  <div
    class="file-dropzone"
    :class="{ 'is-dragging': isDragging, 'is-disabled': disabled }"
    @click="trigger"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <input
      ref="inputRef"
      type="file"
      :accept="accept"
      :disabled="disabled"
      hidden
      @change="onPick"
    />
    <svg class="file-dropzone-icon" viewBox="0 0 24 24" width="28" height="28" fill="none"
         stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    <p class="file-dropzone-label">{{ label }}</p>
    <p v-if="accept" class="file-dropzone-hint">{{ accept }} — max {{ maxSizeMb }} MB</p>
  </div>
</template>

<style scoped>
.file-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 24px;
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text-medium);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  text-align: center;
}
/* Kinder dürfen keine drag/drop-Events klauen — sonst feuert dragover
   auf dem <svg> statt auf dem Container, preventDefault greift nicht
   und der Browser öffnet die Datei stattdessen im Tab. */
.file-dropzone > * { pointer-events: none; }
.file-dropzone:hover {
  border-color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 4%, white);
  color: var(--c-text);
}
.file-dropzone.is-dragging {
  border-color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
}
.file-dropzone.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.file-dropzone-icon { color: currentColor; }
.file-dropzone-label {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
}
.file-dropzone-hint {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
}
</style>
