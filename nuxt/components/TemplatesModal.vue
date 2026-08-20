<script setup lang="ts">
/**
 * TemplatesModal — Zwei-Modus-Dialog:
 *   (a) Select-Modus: Dropdown mit User-Templates für diese Kategorie + LOAD-Button
 *       + "SAVE AS TEMPLATE"-Link (wechselt in Save-Modus)
 *   (b) Save-Modus:   Radio-Group (private default | named template) + Text-Input
 *       + CANCEL / SAVE
 *
 * Wiederverwendet `ModalDialog.vue` (size md) und `useTemplates()` als Datenlayer.
 * Store-Zugriff via useConfigStore (`snapshotForTemplate`, `applyTemplate`).
 */
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '~/stores/configuration'
import { useTemplates, type TemplateRecord } from '~/composables/useTemplates'
import { getCategoryBySlug } from '~/composables/useCategory'

const props = defineProps<{
  open: boolean
  categorySlug: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'applied', t: TemplateRecord): void
  (e: 'saved', t: TemplateRecord): void
}>()

const store = useConfigStore()
const router = useRouter()
// null → alle Templates über alle Kategorien laden (Cross-Category-Load).
// Templates werden beim Save weiterhin an die aktuelle Kategorie gebunden
// (via props.categorySlug in onSave), aber gelesen wird global.
const { templates, defaultId, loading, error, save, remove } = useTemplates(ref(null))

// Default-Auswahl-Priorität: (a) der Private-Default für die aktuelle Kategorie
// falls es einen gibt, (b) sonst das zuletzt geänderte Template.
const currentCategoryDefaultId = computed<string | null>(() => {
  if (!props.categorySlug) return null
  const t = templates.value.find(x => x.categorySlug === props.categorySlug && x.isDefaultForCategory)
  return t?.id || null
})

// UI-Modus + Formstate
type Mode = 'select' | 'save'
const mode = ref<Mode>('select')
const selectedId = ref<string>('')
const saveMode = ref<'default' | 'named'>('default')
const templateName = ref('')
const busy = ref(false)
const busyDelete = ref<string | null>(null)

// Beim (Wieder-)Öffnen: auf Select-Modus zurück, Default-Auswahl übernehmen
watch(
  () => props.open,
  (o) => {
    if (o) {
      mode.value = 'select'
      selectedId.value = currentCategoryDefaultId.value || templates.value[0]?.id || ''
      saveMode.value = 'default'
      templateName.value = ''
    }
  }
)
// Wenn Templates nachladen und noch nichts ausgewählt: Default oder erstes wählen
watch(templates, (list) => {
  if (!selectedId.value && list.length) {
    selectedId.value = currentCategoryDefaultId.value || list[0].id
  }
})

function close() { emit('update:open', false) }

async function onApply() {
  const t = templates.value.find(x => x.id === selectedId.value)
  if (!t) return
  store.applyTemplate(t.configuration)
  store.noteTemplateApplied(t.id ?? null, t.name ?? null)
  emit('applied', t)
  close()
  // Cross-Category-Load: wenn das Template aus einer anderen Kategorie stammt
  // als die aktuell offene, springen wir zum Thermodynamics-Step der Ziel-
  // Kategorie — sonst wären URL (catId) und Store-State inkonsistent.
  if (props.categorySlug && t.categorySlug && t.categorySlug !== props.categorySlug) {
    const targetCat = getCategoryBySlug(t.categorySlug)
    if (targetCat) {
      // sessionStorage-Flag setzen, damit der Auto-Apply-Hook nicht drüberrennt.
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(`gpc:autoApplied:${t.categorySlug}`, '1')
      }
      await router.push(`/mygpc/${targetCat.id}/thermodynamics`)
    }
  }
}

async function onSave() {
  if (!props.categorySlug) return
  const isDefault = saveMode.value === 'default'
  const name = isDefault
    ? (templateName.value.trim() || `Default — ${props.categorySlug}`)
    : templateName.value.trim()
  if (!isDefault && !name) return

  busy.value = true
  const created = await save({
    name,
    categorySlug: props.categorySlug,
    configuration: store.snapshotForTemplate(),
    makeDefault: isDefault
  })
  busy.value = false
  if (created) {
    emit('saved', created)
    close()
  }
}

// Zwei-Stufen-Delete: (1) icon-click öffnet Confirm-Modal → (2) Confirm ruft remove().
// Verhindert versehentliches Löschen; ersetzt den nativen browser-confirm() Dialog.
const pendingDelete = ref<TemplateRecord | null>(null)

function askDelete(t: TemplateRecord) {
  pendingDelete.value = t
}
function cancelDelete() {
  pendingDelete.value = null
}
async function confirmDelete() {
  const t = pendingDelete.value
  if (!t) return
  busyDelete.value = t.id
  pendingDelete.value = null
  await remove(t.id)
  busyDelete.value = null
  if (selectedId.value === t.id) {
    selectedId.value = defaultId.value || templates.value[0]?.id || ''
  }
}
</script>

<template>
  <ModalDialog :open="open" title="Templates" size="md" @update:open="v => emit('update:open', v)">
    <template v-if="mode === 'select'">
      <div class="tpl-field">
        <label class="tpl-label">Template</label>
        <div class="tpl-row">
          <select v-model="selectedId" class="tpl-select" :disabled="loading || !templates.length">
            <option v-if="!templates.length" value="">— No saved templates —</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.isSystem ? '★ ' : '' }}{{ t.name }}
              <template v-if="t.categorySlug"> — {{ (getCategoryBySlug(t.categorySlug)?.title || t.categorySlug) }}</template>
              {{ t.isSystem ? ' [SYSTEM]' : (t.isDefaultForCategory ? ' ★ Default' : '') }}
            </option>
          </select>
          <button
            v-if="selectedId && templates.find(t => t.id === selectedId)?.isOwn"
            type="button"
            class="tpl-icon-btn"
            :disabled="busyDelete === selectedId"
            :aria-label="`Delete template ${templates.find(t => t.id === selectedId)?.name}`"
            @click="() => { const t = templates.find(x => x.id === selectedId); if (t) askDelete(t) }"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 4h10M6 4V2.5h4V4M4.5 4l0.5 9h6l0.5-9M6.5 6.5v5M9.5 6.5v5"/>
            </svg>
          </button>
        </div>
      </div>

      <button type="button" class="tpl-link" @click="mode = 'save'">SAVE AS TEMPLATE</button>

      <p v-if="error" class="tpl-error">{{ error }}</p>
    </template>

    <template v-else>
      <div class="tpl-field">
        <label class="tpl-label">Template</label>
        <div class="tpl-select tpl-select-static">{{ templateName || 'myTemplate' }}</div>
      </div>

      <h4 class="tpl-subhead">SAVE AS TEMPLATE</h4>

      <label class="tpl-radio">
        <input type="radio" v-model="saveMode" value="default" />
        <span class="tpl-radio-body">
          <strong>Save as my private default template</strong>
          <span class="tpl-radio-hint">this will always be used when opening this category</span>
        </span>
      </label>

      <label class="tpl-radio">
        <input type="radio" v-model="saveMode" value="named" />
        <span class="tpl-radio-body">
          <strong>Save as Template</strong>
        </span>
      </label>

      <input
        v-if="saveMode === 'named'"
        v-model="templateName"
        type="text"
        class="tpl-input"
        placeholder="Your template name"
        maxlength="120"
      />

      <p v-if="error" class="tpl-error">{{ error }}</p>
    </template>

    <template #footer>
      <template v-if="mode === 'select'">
        <button type="button" class="btn btn-outline" @click="close">Close</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!selectedId || loading"
          @click="onApply"
        >Load</button>
      </template>
      <template v-else>
        <button type="button" class="btn btn-outline" @click="mode = 'select'">Cancel</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="busy || (saveMode === 'named' && !templateName.trim())"
          @click="onSave"
        >{{ busy ? 'Saving…' : 'Save' }}</button>
      </template>
    </template>
  </ModalDialog>

  <!-- Confirm-Delete-Dialog — genestet, aber ModalDialog Teleport'ed nach body,
       daher als Sibling zum Templates-Modal (nicht innen drin). Damit steht der
       Confirm über dem Templates-Modal statt darunter. -->
  <ModalDialog
    :open="!!pendingDelete"
    title="Delete template"
    size="sm"
    @update:open="v => { if (!v) cancelDelete() }"
  >
    <p>
      Delete template <strong>"{{ pendingDelete?.name }}"</strong>? This cannot be undone.
    </p>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="cancelDelete">Cancel</button>
      <button type="button" class="btn btn-danger" @click="confirmDelete">Delete</button>
    </template>
  </ModalDialog>
</template>

<style scoped>
.tpl-field { margin-bottom: 20px; }
.tpl-label {
  display: block;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-value, #262326);
  margin-bottom: 6px;
}
.tpl-row { display: flex; gap: 8px; align-items: center; }
.tpl-select, .tpl-select-static, .tpl-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--c-border-input, #a6a3ad);
  border-radius: 4px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  background: white;
  color: var(--c-text-value, #262326);
}
.tpl-select-static { background: var(--c-surface-alt, #f5f4f0); color: var(--c-text-medium, #676377); }
.tpl-select:focus, .tpl-input:focus {
  outline: none;
  border-color: var(--c-brand-blue, #0078BE);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue, #0078BE) 25%, transparent);
}

.tpl-icon-btn {
  flex-shrink: 0;
  border: 1px solid var(--c-border-input, #a6a3ad);
  background: white;
  color: var(--c-text-medium, #676377);
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, border-color 0.15s;
}
.tpl-icon-btn:hover:not(:disabled) {
  color: var(--c-error, #B33A3A);
  border-color: var(--c-error, #B33A3A);
}
.tpl-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.tpl-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--c-brand-blue, #0078BE);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  margin-bottom: 12px;
}
.tpl-link:hover { text-decoration: underline; }

.tpl-subhead {
  margin: 20px 0 12px;
  color: var(--c-brand-blue, #0078BE);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  font-weight: 500;
  letter-spacing: 0.05em;
}

.tpl-radio {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  cursor: pointer;
}
.tpl-radio input[type="radio"] {
  margin-top: 3px;
  accent-color: var(--c-brand-blue, #0078BE);
  flex-shrink: 0;
}
.tpl-radio-body { display: flex; flex-direction: column; gap: 2px; font-family: var(--font-ui); font-size: var(--font-2xs, 14.17px); color: var(--c-text-value, #262326); }
.tpl-radio-hint { color: var(--c-text-medium, #676377); font-size: var(--font-3xs, 12.81px); }

.tpl-error {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-error, #B33A3A) 12%, white);
  color: var(--c-error, #B33A3A);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
}

/* Destruktiver Primary-Button für den Delete-Confirm-Dialog — nicht global,
   damit .btn-danger nicht durch's ganze Design-System propagiert. */
.btn-danger {
  background: var(--c-error, #B33A3A);
  color: white;
  border: 1px solid var(--c-error, #B33A3A);
}
.btn-danger:hover { filter: brightness(1.08); }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
