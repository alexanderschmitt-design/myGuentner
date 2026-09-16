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
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import ParamsEditor from './ParamsEditor.vue'
import ConfigQuestionCard from '~/components/ConfigQuestionCard.vue'
import { CATEGORIES } from '~/composables/useCategory'
import {
  CHOICE_ICONS,
  CHOICE_ICONS_GROUPED,
  findChoiceIcon,
  FALLBACK_SVG_PATH,
  type ChoiceIconGroup
} from '~/data/choiceIcons'

interface Choice {
  label: string
  detail?: string
  params: Record<string, unknown>
  icon?: string
}
interface Question {
  id: string
  message: string
  targetLearnId?: string
  choices: Choice[]
}
interface DemoOverrideItem { templateId: string; matchCount: number }
interface DemoOverride { enabled: boolean; items: DemoOverrideItem[] }

interface DbFlow {
  id: string
  entry_id: string
  tab_id: 'application' | 'refrigerant' | 'basic'
  title: string
  questions: Question[]
  fixed_params: Record<string, unknown>
  target_kind: 'static' | 'refrigerant-map'
  target_cat_id: number | null
  target_slug: string | null
  enabled: boolean
  updated_at: string
  demo_override?: DemoOverride | null
}

interface TemplateSummary {
  id: string
  name: string
  categorySlug: string | null
  isSystem: boolean
  paramCount: number
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

const draft = ref<DbFlow | null>(null)
const busy = ref(false)

watch(() => props.open, (o) => {
  if (o && props.flow) {
    draft.value = JSON.parse(JSON.stringify(props.flow))
    if (!Array.isArray(draft.value!.questions)) draft.value!.questions = []
    draft.value!.questions.forEach(q => { if (!Array.isArray(q.choices)) q.choices = [] })
    if (!draft.value!.fixed_params || typeof draft.value!.fixed_params !== 'object') {
      draft.value!.fixed_params = {}
    }
    if (!draft.value!.demo_override || typeof draft.value!.demo_override !== 'object') {
      draft.value!.demo_override = { enabled: false, items: [] }
    }
    previewQuestionIdx.value = 0
    loadTemplateCatalog()
  }
})

function close() { emit('update:open', false) }

// -------- Demo Override --------

const templateCatalog = ref<TemplateSummary[]>([])
const catalogLoading = ref(false)

function countParams(cfg: any): number {
  if (!cfg?.parameters) return 0
  let n = 0
  for (const v of Object.values(cfg.parameters as Record<string, unknown>)) {
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'number' && !Number.isFinite(v)) continue
    n++
  }
  return n
}

async function loadTemplateCatalog() {
  if (templateCatalog.value.length > 0) return
  catalogLoading.value = true
  try {
    const res = await $fetch<{ ok: boolean; templates: any[] }>('/api/admin/templates')
    if (res.ok && Array.isArray(res.templates)) {
      templateCatalog.value = res.templates.map(t => ({
        id: t.id,
        name: t.name,
        categorySlug: t.categorySlug || null,
        isSystem: t.isSystem === true,
        paramCount: countParams(t.configuration)
      }))
    }
  } finally {
    catalogLoading.value = false
  }
}

function ensureOverrideSlot(idx: number) {
  if (!draft.value) return
  const o = draft.value.demo_override!
  while (o.items.length <= idx) o.items.push({ templateId: '', matchCount: 3 - o.items.length })
}

function setOverrideTemplate(slotIdx: number, templateId: string) {
  if (!draft.value) return
  ensureOverrideSlot(slotIdx)
  draft.value.demo_override!.items[slotIdx].templateId = templateId
}

function removeOverrideSlot(slotIdx: number) {
  if (!draft.value) return
  draft.value.demo_override!.items.splice(slotIdx, 1)
}

function addOverrideSlot() {
  if (!draft.value) return
  const o = draft.value.demo_override!
  if (o.items.length >= 3) return
  const matchCount = 3 - o.items.length
  o.items.push({ templateId: '', matchCount })
}

const overrideTemplateDetails = computed(() => {
  const o = draft.value?.demo_override
  if (!o) return []
  return o.items.map(item => {
    const t = templateCatalog.value.find(c => c.id === item.templateId)
    return { ...item, name: t?.name, categorySlug: t?.categorySlug, paramCount: t?.paramCount, found: !!t }
  })
})

const catalogByCategory = computed(() => {
  const groups: Array<{ slug: string; label: string; templates: TemplateSummary[] }> = []
  const seen = new Map<string, number>()
  for (const t of templateCatalog.value) {
    const slug = t.categorySlug || 'other'
    if (!seen.has(slug)) {
      seen.set(slug, groups.length)
      groups.push({ slug, label: slug, templates: [] })
    }
    groups[seen.get(slug)!].templates.push(t)
  }
  return groups
})

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
  if (previewQuestionIdx.value >= draft.value.questions.length) {
    previewQuestionIdx.value = Math.max(0, draft.value.questions.length - 1)
  }
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

// -------- Icon Picker --------

const pickerTarget = ref<{ qIdx: number; cIdx: number } | null>(null)
const pickerSearch = ref('')

const filteredPickerGroups = computed(() => {
  const q = pickerSearch.value.trim().toLowerCase()
  if (!q) return CHOICE_ICONS_GROUPED
  const result = new Map<ChoiceIconGroup, typeof CHOICE_ICONS[number][]>()
  for (const [group, icons] of CHOICE_ICONS_GROUPED) {
    const matches = icons.filter(i =>
      i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)
    )
    if (matches.length) result.set(group, matches)
  }
  return result
})

const pickerCurrentChoice = computed(() => {
  if (!pickerTarget.value || !draft.value) return null
  return draft.value.questions[pickerTarget.value.qIdx]?.choices[pickerTarget.value.cIdx] ?? null
})

function openPicker(qIdx: number, cIdx: number) {
  pickerTarget.value = { qIdx, cIdx }
  pickerSearch.value = ''
}

function closePicker() {
  pickerTarget.value = null
}

function selectIcon(key: string) {
  if (!pickerTarget.value || !draft.value) return
  const { qIdx, cIdx } = pickerTarget.value
  draft.value.questions[qIdx].choices[cIdx].icon = key
  closePicker()
}

function clearIcon() {
  if (!pickerTarget.value || !draft.value) return
  const { qIdx, cIdx } = pickerTarget.value
  draft.value.questions[qIdx].choices[cIdx].icon = undefined
  closePicker()
}

function choiceIconSvg(iconKey?: string): string {
  const path = iconKey ? (findChoiceIcon(iconKey)?.svgPath ?? FALLBACK_SVG_PATH) : FALLBACK_SVG_PATH
  return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && pickerTarget.value) closePicker()
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

// -------- Vorschau --------

const previewQuestionIdx = ref(0)

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
          enabled: draft.value.enabled,
          demoOverride: draft.value.demo_override
            ? {
                enabled: draft.value.demo_override.enabled,
                items: draft.value.demo_override.items
                  .filter(i => i.templateId)
                  .map(i => ({ templateId: i.templateId, matchCount: i.matchCount }))
              }
            : null
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
                <!-- Icon-Picker-Trigger -->
                <button
                  type="button"
                  class="choice-icon-btn"
                  :title="c.icon ? (findChoiceIcon(c.icon)?.label ?? c.icon) : 'Icon wählen'"
                  @click.stop="openPicker(qIdx, cIdx)"
                >
                  <span v-html="choiceIconSvg(c.icon)"></span>
                </button>
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

      <!-- Live-Vorschau -->
      <section class="editor-section">
        <div class="editor-section-head">
          <h3>Vorschau (wie im Chat)</h3>
          <select
            v-if="draft.questions.length > 1"
            v-model="previewQuestionIdx"
            class="field-input preview-select"
          >
            <option v-for="(q, i) in draft.questions" :key="i" :value="i">
              Q{{ i + 1 }}: {{ q.id }}
            </option>
          </select>
        </div>
        <ConfigQuestionCard
          v-if="draft.questions[previewQuestionIdx]"
          :message="draft.questions[previewQuestionIdx].message"
          :suggestions="draft.questions[previewQuestionIdx].choices"
          card-label="CONFIGURATION QUESTION"
          :preview="true"
        />
        <div v-else class="empty-hint">Keine Fragen definiert.</div>
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

      <!-- Demo Override -->
      <section class="editor-section override-section" :class="{ 'override-active': draft.demo_override?.enabled }">
        <div class="editor-section-head">
          <div class="override-title-row">
            <h3>Demo Override — Recommended Products</h3>
            <span v-if="draft.demo_override?.enabled" class="override-badge">🎯 ACTIVE</span>
          </div>
          <label class="field-inline">
            <input type="checkbox" v-model="draft.demo_override!.enabled" />
            <span>Enable override for this flow</span>
          </label>
        </div>
        <p class="section-hint">
          When enabled, the "Recommended Products" step shows exactly these pinned templates instead of running dynamic matching.
          Disable after the presentation to restore real scoring.
        </p>

        <div v-if="catalogLoading" class="override-loading">Loading template catalog…</div>

        <div v-else class="override-slots">
          <div
            v-for="(slot, idx) in overrideTemplateDetails"
            :key="idx"
            class="override-slot"
            :class="{ 'slot-missing': slot.templateId && !slot.found }"
          >
            <span class="slot-pos" :class="`slot-pos-${idx}`">{{ ['★★★', '★★', '★'][idx] }}</span>
            <div class="slot-body">
              <select
                class="field-input slot-select"
                :value="slot.templateId"
                @change="setOverrideTemplate(idx, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">— Pick a template —</option>
                <optgroup v-for="cat in catalogByCategory" :key="cat.slug" :label="cat.label">
                  <option v-for="t in cat.templates" :key="t.id" :value="t.id">
                    {{ t.name }}{{ t.isSystem ? ' ★' : '' }} ({{ t.paramCount }}p)
                  </option>
                </optgroup>
              </select>
              <div v-if="slot.found" class="slot-info">
                <span class="slot-info-name">{{ slot.name }}</span>
                <span class="slot-info-detail">{{ slot.paramCount }} params · {{ slot.categorySlug || '—' }}</span>
              </div>
              <div v-else-if="slot.templateId" class="slot-info slot-info-missing">Template not found (ID: {{ slot.templateId.slice(0,8) }}…)</div>
            </div>
            <div class="slot-match">
              <label class="slot-match-label">Matches</label>
              <select
                class="slot-match-select"
                :value="slot.matchCount"
                @change="draft.demo_override!.items[idx].matchCount = Number(($event.target as HTMLSelectElement).value)"
              >
                <option :value="3">3 — green</option>
                <option :value="2">2 — amber</option>
                <option :value="1">1 — muted</option>
              </select>
            </div>
            <button type="button" class="btn btn-icon btn-danger" @click="removeOverrideSlot(idx)" title="Remove">×</button>
          </div>

          <button
            v-if="(draft.demo_override?.items.length ?? 0) < 3"
            type="button"
            class="btn btn-outline btn-sm"
            :disabled="catalogLoading"
            @click="addOverrideSlot"
          >+ Add Slot</button>
        </div>
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

  <!-- Icon Picker Overlay — außerhalb des Modals damit z-index passt -->
  <Teleport to="body">
    <div v-if="pickerTarget" class="picker-backdrop" @click="closePicker">
      <div class="picker-panel" @click.stop>

        <div class="picker-header">
          <span class="picker-title">
            Icon wählen
            <span v-if="pickerCurrentChoice" class="picker-for">für „{{ pickerCurrentChoice.label || '…' }}"</span>
          </span>
          <input
            v-model="pickerSearch"
            class="picker-search"
            placeholder="Suchen…"
            autofocus
          />
          <button type="button" class="picker-clear-btn" @click="clearIcon">Kein Icon</button>
          <button type="button" class="btn-icon" @click="closePicker" title="Schließen">×</button>
        </div>

        <!-- Mini-Vorschau der aktuellen Wahl -->
        <div v-if="pickerCurrentChoice" class="picker-preview-bar">
          <span class="picker-preview-label">Aktuelle Vorschau:</span>
          <div class="picker-preview-choice">
            <span class="picker-preview-icon" v-html="choiceIconSvg(pickerCurrentChoice.icon)"></span>
            <span class="picker-preview-text">{{ pickerCurrentChoice.label || '…' }}</span>
            <span v-if="pickerCurrentChoice.detail" class="picker-preview-detail">{{ pickerCurrentChoice.detail }}</span>
          </div>
        </div>

        <div class="picker-groups">
          <template v-for="[group, icons] in filteredPickerGroups" :key="group">
            <div class="picker-group-label">{{ group }}</div>
            <div class="picker-grid">
              <button
                v-for="icon in icons"
                :key="icon.key"
                type="button"
                class="picker-icon-btn"
                :class="{ 'is-active': pickerCurrentChoice?.icon === icon.key }"
                :title="icon.label"
                @click="selectIcon(icon.key)"
              >
                <span v-html="choiceIconSvg(icon.key)"></span>
                <span class="picker-icon-label">{{ icon.label }}</span>
              </button>
            </div>
          </template>
          <div v-if="filteredPickerGroups.size === 0" class="picker-empty">Keine Icons gefunden.</div>
        </div>

      </div>
    </div>
  </Teleport>
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

/* Vorschau-Selector */
.preview-select {
  padding: 4px 8px;
  font-size: var(--font-3xs, 12.81px);
  min-width: 0;
  max-width: 260px;
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

/* Icon-Picker-Trigger-Button */
.choice-icon-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid var(--c-border-input, #a6a3ad);
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 8%, white);
  color: var(--c-brand-blue, #0078BE);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.12s, background 0.12s;
}
.choice-icon-btn:hover {
  border-color: var(--c-brand-blue, #0078BE);
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 16%, white);
}

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

<!-- Picker-Styles unscoped da via Teleport außerhalb des Scoped-DOM gerendert -->
<style>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.picker-panel {
  background: white;
  border-radius: 10px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22);
  width: 520px;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.picker-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #e6e4ea;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.picker-title {
  font-family: var(--font-ui, sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: #262326;
  white-space: nowrap;
}
.picker-for {
  font-weight: 400;
  color: #676377;
  margin-left: 4px;
}
.picker-search {
  flex: 1;
  min-width: 120px;
  padding: 6px 10px;
  border: 1px solid #a6a3ad;
  border-radius: 4px;
  font-size: 13px;
  font-family: var(--font-ui, sans-serif);
  outline: none;
}
.picker-search:focus { border-color: #0078BE; }
.picker-clear-btn {
  padding: 5px 10px;
  font-size: 12px;
  border: 1px solid #a6a3ad;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-family: var(--font-ui, sans-serif);
  white-space: nowrap;
  color: #676377;
}
.picker-clear-btn:hover { border-color: #0078BE; color: #0078BE; }

/* Mini-Vorschau im Picker */
.picker-preview-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f5f4f0;
  border-bottom: 1px solid #e6e4ea;
  flex-shrink: 0;
}
.picker-preview-label {
  font-size: 11px;
  color: #676377;
  white-space: nowrap;
}
.picker-preview-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: white;
  border: 1px solid #cfcdd6;
  border-radius: 4px;
  flex: 1;
}
.picker-preview-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: color-mix(in srgb, #0078BE 10%, white);
  color: #0078BE;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.picker-preview-text {
  font-size: 13px;
  font-weight: 600;
  color: #262326;
}
.picker-preview-detail {
  font-size: 11px;
  color: #676377;
  margin-left: 4px;
}

/* Icon-Raster */
.picker-groups {
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.picker-group-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #676377;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 6px;
}
.picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
.picker-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #f5f4f0;
  cursor: pointer;
  color: #262326;
  transition: border-color 0.1s, background 0.1s, color 0.1s;
}
.picker-icon-btn:hover {
  border-color: #0078BE;
  background: color-mix(in srgb, #0078BE 8%, white);
  color: #0078BE;
}
.picker-icon-btn.is-active {
  border-color: #0078BE;
  background: color-mix(in srgb, #0078BE 14%, white);
  color: #0078BE;
}
.picker-icon-label {
  font-size: 9.5px;
  font-family: var(--font-ui, sans-serif);
  text-align: center;
  line-height: 1.2;
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #676377;
}
.picker-empty {
  padding: 24px;
  text-align: center;
  color: #676377;
  font-style: italic;
  font-size: 13px;
}

/* ---- Demo Override section ---- */
.override-section {
  border-color: color-mix(in srgb, var(--c-warning, #F5B800) 35%, transparent);
}
.override-section.override-active {
  border-color: var(--c-warning, #F5B800);
  background: color-mix(in srgb, var(--c-warning, #F5B800) 4%, white);
}
.override-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.override-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  background: color-mix(in srgb, var(--c-warning, #F5B800) 22%, white);
  color: color-mix(in srgb, var(--c-warning, #F5B800) 65%, #3a2800);
  border: 1px solid color-mix(in srgb, var(--c-warning, #F5B800) 50%, transparent);
}
.override-loading {
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium);
  font-style: italic;
  padding: 8px 0;
}
.override-slots {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.override-slot {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: white;
  border: 1px solid var(--c-border, #cfcdd6);
  border-radius: var(--radius-xs, 4px);
}
.override-slot.slot-missing { border-color: var(--c-error, #B33A3A); }
.slot-pos {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  width: 28px;
  text-align: center;
  padding-top: 6px;
}
.slot-pos-0 { color: var(--c-success, #2E7D4F); }
.slot-pos-1 { color: var(--c-warning, #F5B800); filter: brightness(0.7); }
.slot-pos-2 { color: var(--c-text-medium, #676377); }
.slot-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.slot-select { width: 100%; }
.slot-info {
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
  display: flex;
  gap: 8px;
}
.slot-info-name { font-weight: 600; color: var(--c-text-value); }
.slot-info-detail { color: var(--c-text-medium); }
.slot-info-missing { color: var(--c-error, #B33A3A); font-style: italic; }
.slot-match {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.slot-match-label {
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
  font-family: var(--font-ui);
}
.slot-match-select {
  padding: 4px 6px;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  font-size: var(--font-4xs, 11.58px);
  font-family: var(--font-ui);
  background: white;
  cursor: pointer;
}
</style>
