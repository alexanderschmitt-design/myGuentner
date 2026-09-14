/**
 * useTemplateEdit — globale State für den Wizard-Edit-Modus.
 *
 * Trigger: `/mygpc/<catId>/thermodynamics?edit=<id>` (siehe thermodynamics.vue).
 * Effekt: Der Wizard lädt das Template in den Store, zeigt oben ein Banner
 * ("Editing template: X · Cancel · Save Changes") und wechselt den
 * Save-Pfad von POST → PUT.
 *
 * Über `useState()` — überlebt Route-Wechsel innerhalb der App, wird aber
 * beim Full-Reload zurückgesetzt (was gewollt ist: kein "hängendes" Edit-State).
 */

export interface TemplateEditState {
  templateId: string
  templateName: string
  /** 'user' → PUT /api/templates/:id, 'admin' → PUT /api/admin/templates/:id */
  mode: 'user' | 'admin'
  /** Kategorie-Slug beim Start des Edits — für Save-Guard, wenn User im Wizard
   *  die Kategorie wechseln würde. */
  categorySlug: string
}

export function useTemplateEdit() {
  const state = useState<TemplateEditState | null>('wizard-template-edit', () => null)

  function start(payload: TemplateEditState) {
    state.value = payload
  }

  function cancel() {
    state.value = null
  }

  const isEditing = computed(() => state.value !== null)

  return { state, isEditing, start, cancel }
}
