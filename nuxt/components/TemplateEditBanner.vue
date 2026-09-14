<script setup lang="ts">
/**
 * TemplateEditBanner — persistente Info-Zeile über dem Wizard, wenn der User
 * ein bestehendes Template editiert (Trigger: ?edit=<id>). Zeigt Namen +
 * Modus (User/Admin) + zwei Aktionen: Cancel (verwirft Änderungen) und Save
 * (schreibt Snapshot zurück).
 *
 * Muss im Wizard-Layout gemounted sein (default.vue), damit alle Steps das
 * Banner sehen (Thermodynamics → Unit Selection → Search → Datasheet).
 */

const { state, cancel } = useTemplateEdit()
const configStore = useConfigStore()
const { update } = useTemplates(computed(() => configStore.currentCategory))
const toast = useToast()
const router = useRouter()

const saving = ref(false)
const showCancelConfirm = ref(false)

// Inline-editierbarer Name — initialisiert aus dem Edit-State, damit der
// User den Namen während der Edit-Session anpassen kann.
const editedName = ref(state.value?.templateName ?? '')
watch(() => state.value?.templateName, (n) => { if (n) editedName.value = n })

async function save() {
  if (!state.value || saving.value) return
  saving.value = true
  try {
    const payload = configStore.snapshotForTemplate()
    const trimmedName = editedName.value.trim()
    const updated = await update(state.value.templateId, {
      configuration: payload,
      ...(trimmedName && trimmedName !== state.value.templateName ? { name: trimmedName } : {}),
      asAdmin: state.value.mode === 'admin'
    })
    if (updated) {
      toast.success(`Template "${updated.name}" updated`)
      cancel()
      // Admin kehrt zur Admin-Übersicht zurück, normale User bleiben im Wizard.
      if (state.value?.mode === 'admin') {
        router.push('/admin/system-templates')
      }
    } else {
      toast.error('Update failed — check server logs')
    }
  } finally {
    saving.value = false
  }
}

function confirmCancel() {
  showCancelConfirm.value = true
}
function doCancel() {
  cancel()
  showCancelConfirm.value = false
  toast.info('Template edit cancelled')
}
</script>

<template>
  <div v-if="state" class="template-edit-banner" role="status" aria-live="polite">
    <span class="tag">EDITING</span>
    <span class="tag tag-mode">{{ state.mode === 'admin' ? 'Admin' : 'My template' }}</span>
    <input
      v-model="editedName"
      class="name-input"
      type="text"
      maxlength="120"
      aria-label="Template name"
      :disabled="saving"
    />
    <span class="spacer" />
    <button type="button" class="btn-text" @click="confirmCancel" :disabled="saving">Cancel</button>
    <button type="button" class="btn-primary" @click="save" :disabled="saving">
      {{ saving ? 'Saving…' : 'Save Changes' }}
    </button>

    <Teleport to="body">
      <div v-if="showCancelConfirm" class="cancel-backdrop" @click.self="showCancelConfirm = false">
        <div class="cancel-modal" role="dialog" aria-labelledby="cancel-title">
          <h3 id="cancel-title">Discard changes?</h3>
          <p>Your edits to <strong>{{ editedName || state.templateName }}</strong> will not be saved.</p>
          <div class="actions">
            <button type="button" class="btn-text" @click="showCancelConfirm = false">Keep editing</button>
            <button type="button" class="btn-danger" @click="doCancel">Discard</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.template-edit-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 10%, white);
  border-bottom: 1px solid color-mix(in srgb, var(--c-brand-blue, #0078BE) 30%, transparent);
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-value, #262326);
}
.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-3xs, 12.81px);
  font-weight: 600;
  background: var(--c-brand-blue, #0078BE);
  color: white;
  letter-spacing: 0.5px;
}
.tag-mode {
  background: transparent;
  color: var(--c-brand-blue, #0078BE);
  border: 1px solid currentColor;
}
.name-input {
  font-family: var(--font-mono, 'DM Mono', monospace);
  font-size: var(--font-2xs, 14.17px);
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 3px 8px;
  background: transparent;
  color: var(--c-text-value, #262326);
  min-width: 160px;
  max-width: 320px;
  transition: border-color 0.15s, background 0.15s;
}
.name-input:hover:not(:disabled) {
  border-color: var(--c-border-input, #a6a3ad);
  background: white;
}
.name-input:focus {
  outline: none;
  border-color: var(--c-brand-blue, #0078BE);
  background: white;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue, #0078BE) 15%, transparent);
}
.name-input:disabled { opacity: 0.6; cursor: not-allowed; }
.spacer { flex: 1; }
.btn-text {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 12px;
  color: var(--c-text-medium, #676377);
  font-size: var(--font-2xs, 14.17px);
  border-radius: 4px;
}
.btn-text:hover { background: rgba(0,0,0,0.05); }
.btn-primary {
  padding: 6px 16px;
  background: var(--c-brand-blue, #0078BE);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: var(--font-2xs, 14.17px);
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: wait; }

.cancel-backdrop {
  position: fixed; inset: 0;
  background: rgba(28, 26, 33, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
  padding: 24px;
}
.cancel-modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 400px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}
.cancel-modal h3 { margin: 0 0 8px; font-family: var(--font-ui); font-size: 16px; }
.cancel-modal p { margin: 0 0 16px; font-family: var(--font-ui); font-size: 14px; color: #444; }
.cancel-modal .actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn-danger {
  padding: 6px 16px;
  background: #B33A3A;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 14px;
}
</style>
