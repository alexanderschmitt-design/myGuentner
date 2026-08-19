<script setup lang="ts">
/**
 * GuidedFlowEditor — Modal-Inhalt für das Editieren einer Guided-Flow-Config.
 *
 * v-model:open   — Modal-Sichtbarkeit
 * :flow          — DbFlow (aktueller Row-Snapshot). Draft-Kopie wird intern
 *                  gehalten, damit Cancel verlustfrei möglich ist.
 * @saved         — nach erfolgreichem PUT (Parent macht reload + optional
 *                  Loader-Invalidate)
 *
 * Für refrigerant-map-Targets ist das Ziel readonly — dessen Mapping-Logik
 * lebt im Code (nuxt/data/homeEntryFlows.ts, REFRIGERANT_TARGET_MAP).
 */
import { ref, watch, computed } from 'vue'
import ParamsEditor from './ParamsEditor.vue'
import { CATEGORIES } from '~/composables/useCategory'

interface Choice {
  label: string
  detail?: string
  params: Record<string, unknown>
}
interface Question {
  id: string
  message: string
  targetLearnId?: string
  choices: Choice[]
}
interface DbFlow {
  entry_id: string
  tab_id: 'application' | 'refrigerant'
  title: string
  questions: Question[]
  fixed_params: Record<string, unknown>
  target_kind: 'static' | 'refrigerant-map'
  target_cat_id: number | null
  target_slug: string | null
  enabled: boolean
  updated_at?: string
}

const props = defineProps<{
  open: boolean
  flow: DbFlow | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'saved', flow: DbFlow): void
}>()

const toast = useToast()

// Draft-Kopie — v-model auf props direkt würde Parent-State beim Cancel
// bereits mutieren. JSON-Roundtrip = deep clone ohne Vue-Reactivity-Anteile.
const draft = ref<DbFlow | null>(null)
const busy = ref(false)

watch(() => props.open, (o) => {
  if (o && props.flow) {
    draft.value = JSON.parse(JSON.stringify(props.flow))
    // Defensiv: sicherstellen dass Arrays existieren
    if (!Array.isArray(draft.value!.questions)) draft.value!.questions = []
    draft.value!.questions.forEach(q => { if (!Array.isArray(q.choices)) q.choices = [] })
    if (!draft.value!.fixed_params || typeof draft.value!.fixed_params !== 'object') {
      draft.value!.fixed_params = {}
    }
  }
})

function close() { emit('update:open', false) }

// -------- Fragen-Manipulation --------

function addQuestion() {
  if (!draft.value) return
  draft.value.questions.push({
    id: `q-${Date.now()}`,
    message: 'New question — edit me.',
    choices: []
  })
}
function removeQuestion(idx: number) {
  if (!draft.value) return
  draft.value.questions.splice(idx, 1)
}
function moveQuestion(idx: number, dir: -1 | 1) {
  if (!draft.value) return
  const next = idx + dir
  if (next < 0 || next >= draft.value.questions.length) return
  const list = draft.value.questions
  ;[list[idx], list[next]] = [list[next], list[idx]]
}

// -------- Choice-Manipulation --------

function addChoice(qIdx: number) {
  if (!draft.value) return
  draft.value.questions[qIdx].choices.push({ label: 'New choice', detail: '', params: {} })
}
function removeChoice(qIdx: number, cIdx: number) {
  if (!draft.value) return
  draft.value.questions[qIdx].choices.splice(cIdx, 1)
}
function moveChoice(qIdx: number, cIdx: number, dir: -1 | 1) {
  if (!draft.value) return
  const list = draft.value.questions[qIdx].choices
  const next = cIdx + dir
  if (next < 0 || next >= list.length) return
  ;[list[cIdx], list[next]] = [list[next], list[cIdx]]
}
function updateChoiceParams(qIdx: number, cIdx: number, params: Record<string, unknown>) {
  if (!draft.value) return
  draft.value.questions[qIdx].choices[cIdx].params = params
}
function updateFixedParams(params: Record<string, unknown>) {
  if (!draft.value) return
  draft.value.fixed_params = params
}

// -------- Target --------

const isRefrigerantMap = computed(() => draft.value?.target_kind === 'refrigerant-map')
const categoryOptions = computed(() => CATEGORIES.map(c => ({
  catId: c.id,
  slug: c.slug,
  label: `${c.title}${c.sublabel ? ' ' + c.sublabel : ''} (catId ${c.id})`
})))

function onTargetSlugChange(slug: string) {
  if (!draft.value) return
  const cat = CATEGORIES.find(c => c.slug === slug)
  if (cat) {
    draft.value.target_slug = cat.slug
    draft.value.target_cat_id = cat.id
  }
}

// -------- Save --------

const validationError = computed<string | null>(() => {
  const d = draft.value
  if (!d) return null
  if (!d.title.trim()) return 'Title cannot be empty.'
  if (!d.questions.length) return 'At least one question required.'
  for (const [i, q] of d.questions.entries()) {
    if (!q.message.trim()) return `Question ${i + 1}: message empty.`
    if (!q.choices.length) return `Question ${i + 1}: needs at least one choice.`
    for (const [j, c] of q.choices.entries()) {
      if (!c.label.trim()) return `Q${i + 1} choice ${j + 1}: label empty.`
    }
  }
  if (d.target_kind === 'static') {
    if (!d.target_slug) return 'Target: pick a category.'
  }
  return null
})

async function onSave() {
  if (!draft.value || validationError.value) return
  busy.value = true
  try {
    const res = await $fetch<{ ok: boolean; flow: DbFlow; error?: string }>(
      `/api/admin/guided-flows/${encodeURIComponent(draft.value.entry_id)}`,
      {
        method: 'PUT',
        body: {
          title: draft.value.title,
          questions: draft.value.questions,
          fixedParams: draft.value.fixed_params,
          targetKind: draft.value.target_kind,
          targetCatId: draft.value.target_cat_id,
          targetSlug: draft.value.target_slug,
          enabled: draft.value.enabled
        }
      }
    )
    if (!res.ok) throw new Error(res.error || 'Save failed')
    toast.success(`Saved "${draft.value.title}"`)
    emit('saved', res.flow)
    close()
  } catch (err: any) {
    toast.error(err?.data?.error || err?.message || 'Save failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalDialog :open="open" :title="draft ? `Edit: ${draft.title}` : 'Edit Guided Flow'" size="xl" @update:open="v => emit('update:open', v)">
    <div v-if="draft" class="editor">
      <!-- Meta -->
      <section class="editor-section">
        <div class="editor-row">
          <label class="field">
            <span class="field-label">Entry ID</span>
            <input class="field-input" :value="draft.entry_id" readonly disabled />
          </label>
          <label class="field">
            <span class="field-label">Tab</span>
            <input class="field-input" :value="draft.tab_id" readonly disabled />
          </label>
          <label class="field field-grow">
            <span class="field-label">Title</span>
            <input v-model="draft.title" type="text" class="field-input" />
          </label>
          <label class="field-inline">
            <input type="checkbox" v-model="draft.enabled" />
            <span>Enabled</span>
          </label>
        </div>
      </section>

      <!-- Questions -->
      <section class="editor-section">
        <div class="editor-section-head">
          <h3>Questions ({{ draft.questions.length }})</h3>
          <button type="button" class="btn btn-outline btn-sm" @click="addQuestion">+ Add Question</button>
        </div>

        <div v-for="(q, qIdx) in draft.questions" :key="qIdx" class="question-card">
          <div class="question-head">
            <span class="question-badge">Q{{ qIdx + 1 }}</span>
            <input v-model="q.id" type="text" class="q-id-input" placeholder="stable-id" />
            <div class="question-actions">
              <button type="button" class="btn btn-icon" :disabled="qIdx === 0" @click="moveQuestion(qIdx, -1)" title="Move up">↑</button>
              <button type="button" class="btn btn-icon" :disabled="qIdx === draft.questions.length - 1" @click="moveQuestion(qIdx, 1)" title="Move down">↓</button>
              <button type="button" class="btn btn-icon btn-danger" @click="removeQuestion(qIdx)" title="Remove question">×</button>
            </div>
          </div>

          <label class="field">
            <span class="field-label">Message (Markdown)</span>
            <textarea v-model="q.message" class="field-input field-textarea" rows="3"></textarea>
          </label>

          <div class="choices-block">
            <div class="choices-head">
              <span class="choices-label">Choices ({{ q.choices.length }})</span>
              <button type="button" class="btn btn-outline btn-sm" @click="addChoice(qIdx)">+ Add Choice</button>
            </div>
            <div v-for="(c, cIdx) in q.choices" :key="cIdx" class="choice-card">
              <div class="choice-head">
                <input v-model="c.label" type="text" class="choice-label-input" placeholder="Button label" />
                <input v-model="c.detail" type="text" class="choice-detail-input" placeholder="Detail line (optional)" />
                <div class="choice-actions">
                  <button type="button" class="btn btn-icon" :disabled="cIdx === 0" @click="moveChoice(qIdx, cIdx, -1)" title="Move up">↑</button>
                  <button type="button" class="btn btn-icon" :disabled="cIdx === q.choices.length - 1" @click="moveChoice(qIdx, cIdx, 1)" title="Move down">↓</button>
                  <button type="button" class="btn btn-icon btn-danger" @click="removeChoice(qIdx, cIdx)" title="Remove choice">×</button>
                </div>
              </div>
              <div class="choice-params">
                <span class="choice-params-label">Params applied on click:</span>
                <ParamsEditor
                  :params="c.params"
                  @update:params="params => updateChoiceParams(qIdx, cIdx, params)"
                />
              </div>
            </div>
            <div v-if="!q.choices.length" class="empty-hint">No choices yet — add at least one.</div>
          </div>
        </div>

        <div v-if="!draft.questions.length" class="empty-hint">No questions defined. Click "+ Add Question" to start.</div>
      </section>

      <!-- Target -->
      <section class="editor-section">
        <h3>Target Category</h3>
        <p class="section-hint">Where does the wizard navigate after the last question?</p>
        <div class="editor-row">
          <label class="field-inline">
            <input type="radio" v-model="draft.target_kind" value="static" />
            <span>Static</span>
          </label>
          <label class="field-inline">
            <input type="radio" v-model="draft.target_kind" value="refrigerant-map" />
            <span>Refrigerant × Purpose Map (code-defined)</span>
          </label>
        </div>
        <div v-if="!isRefrigerantMap" class="editor-row">
          <label class="field field-grow">
            <span class="field-label">Category</span>
            <select
              :value="draft.target_slug || ''"
              class="field-input"
              @change="onTargetSlugChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>— Pick a category —</option>
              <option v-for="opt in categoryOptions" :key="opt.slug" :value="opt.slug">{{ opt.label }}</option>
            </select>
          </label>
        </div>
        <p v-else class="section-hint">
          Refrigerant × Purpose mapping lives in <code>nuxt/data/homeEntryFlows.ts</code>
          (<code>REFRIGERANT_TARGET_MAP</code>) — editing it requires a code change.
        </p>
      </section>

      <!-- Fixed Params -->
      <section class="editor-section">
        <h3>Fixed Params</h3>
        <p class="section-hint">Applied at the end of the flow regardless of user choices (e.g. <code>coolingPurpose</code>, <code>glycolType</code>).</p>
        <ParamsEditor
          :params="draft.fixed_params"
          @update:params="updateFixedParams"
        />
      </section>

      <p v-if="validationError" class="error-line">⚠ {{ validationError }}</p>
    </div>

    <template #footer>
      <button type="button" class="btn btn-outline" @click="close">Cancel</button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="busy || !!validationError"
        @click="onSave"
      >{{ busy ? 'Saving…' : 'Save' }}</button>
    </template>
  </ModalDialog>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; gap: 20px; }
.editor-section {
  border: 1px solid var(--c-border-card, #e6e4ea);
  border-radius: var(--radius-md, 8px);
  padding: 14px 16px;
  background: white;
}
.editor-section h3 {
  margin: 0 0 8px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  font-weight: 500;
  color: var(--c-text-value, #262326);
}
.editor-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.editor-section-head h3 { margin: 0; }
.section-hint {
  margin: 0 0 8px;
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium, #676377);
}
.section-hint code {
  background: var(--c-surface-alt, #f5f4f0);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.9em;
}

.editor-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.field { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
.field-grow { flex: 1; }
.field-label {
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium, #676377);
}
.field-input {
  padding: 8px 10px;
  border: 1px solid var(--c-border-input, #a6a3ad);
  border-radius: 4px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  background: white;
  color: var(--c-text-value, #262326);
}
.field-input:disabled { background: var(--c-surface-alt, #f5f4f0); color: var(--c-text-medium, #676377); }
.field-input:focus { outline: none; border-color: var(--c-brand-blue, #0078BE); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue, #0078BE) 25%, transparent); }
.field-textarea { resize: vertical; min-height: 60px; font-family: inherit; }
.field-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-2xs, 14.17px);
  cursor: pointer;
  padding: 4px 0;
}

/* Questions */
.question-card {
  border: 1px solid var(--c-border, #cfcdd6);
  border-radius: var(--radius-xs, 4px);
  padding: 12px;
  margin-bottom: 10px;
  background: var(--c-surface-alt, #f5f4f0);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.question-head { display: flex; align-items: center; gap: 8px; }
.question-badge {
  background: var(--c-brand-blue, #0078BE);
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 500;
  flex-shrink: 0;
}
.q-id-input {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--c-text-medium, #676377);
  font-family: var(--font-mono, monospace);
  font-size: var(--font-3xs, 12.81px);
}
.q-id-input:focus { border-color: var(--c-border-input, #a6a3ad); background: white; color: var(--c-text-value, #262326); }

.question-actions { display: flex; gap: 4px; }

/* Choices */
.choices-block { display: flex; flex-direction: column; gap: 6px; }
.choices-head { display: flex; align-items: center; justify-content: space-between; }
.choices-label {
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium, #676377);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.choice-card {
  border: 1px solid var(--c-border-card, #e6e4ea);
  border-radius: var(--radius-xs, 4px);
  padding: 10px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.choice-head { display: flex; gap: 8px; align-items: center; }
.choice-label-input, .choice-detail-input {
  padding: 6px 8px;
  border: 1px solid var(--c-border-input, #a6a3ad);
  border-radius: 4px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  background: white;
}
.choice-label-input { min-width: 180px; font-weight: 500; }
.choice-detail-input { flex: 1; min-width: 150px; color: var(--c-text-medium, #676377); }
.choice-actions { display: flex; gap: 4px; }
.choice-params {
  padding-left: 10px;
  border-left: 2px solid var(--c-border-card, #e6e4ea);
}
.choice-params-label {
  display: block;
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium, #676377);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-hint {
  padding: 12px;
  color: var(--c-text-medium, #676377);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  font-style: italic;
  text-align: center;
}

.btn-icon {
  padding: 4px 8px;
  min-width: 28px;
  font-size: var(--font-3xs, 12.81px);
  border: 1px solid var(--c-border-input, #a6a3ad);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  color: var(--c-text-value, #262326);
}
.btn-icon:hover:not(:disabled) { border-color: var(--c-brand-blue, #0078BE); color: var(--c-brand-blue, #0078BE); }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-icon.btn-danger:hover:not(:disabled) { border-color: var(--c-error, #B33A3A); color: var(--c-error, #B33A3A); }

.btn-sm { padding: 6px 10px; font-size: var(--font-3xs, 12.81px); }

.error-line {
  margin: 0;
  padding: 8px 12px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-error, #B33A3A) 12%, white);
  color: var(--c-error, #B33A3A);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
}
</style>
