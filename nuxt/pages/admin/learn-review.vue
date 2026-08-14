<script setup lang="ts">
/**
 * /admin/learn-review — Moderation-Queue für Wissenspflege.
 *
 * Drei Bereiche:
 *   • Learn-Notizen (Drafts) → approvieren/ablehnen
 *   • Chat-Feedback (Korrekturen) → als Q&A-Pair übernehmen oder verwerfen
 *   • Q&A-Wissensdatenbank → editieren / löschen
 */
import { ref, onMounted, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Wissen prüfen' })

const api = useApi()
const toast = useToast()

type Tab = 'notes' | 'feedback' | 'qa'
const activeTab = ref<Tab>('notes')

interface LearnNoteRow {
  id: string
  user_id: string
  page_url: string
  data_learn_id: string | null
  css_path: string | null
  category: string
  title: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}
interface FeedbackRow {
  id: string
  message_id: string
  user_id: string
  rating: number
  correction_text: string | null
  status: string
  created_at: string
  priorUserMessage: string | null
  chat_messages: {
    id: string
    conversation_id: string
    role: string
    content: string
  }
}
interface QaRow {
  id: string
  question: string
  answer: string
  source: string
  source_ref: string | null
  status: string
  created_at: string
  updated_at: string
}

const notes = ref<LearnNoteRow[]>([])
const feedback = ref<FeedbackRow[]>([])
const qaPairs = ref<QaRow[]>([])
const loading = ref(false)

async function loadNotes() {
  loading.value = true
  try {
    const res = await api.get<{ notes: LearnNoteRow[] }>('/api/learn/notes?status=draft')
    notes.value = res.notes || []
  } catch (err: any) {
    toast.error(err.message || 'Konnte Notes nicht laden')
  } finally {
    loading.value = false
  }
}

async function loadFeedback() {
  loading.value = true
  try {
    const res = await api.get<{ feedback: FeedbackRow[] }>('/api/chat/feedback?status=open')
    feedback.value = res.feedback || []
  } catch (err: any) {
    toast.error(err.message || 'Konnte Feedback nicht laden')
  } finally {
    loading.value = false
  }
}

async function loadQa() {
  loading.value = true
  try {
    const res = await api.get<{ pairs: QaRow[] }>('/api/qa-pairs')
    qaPairs.value = res.pairs || []
  } catch (err: any) {
    toast.error(err.message || 'Konnte Q&A nicht laden')
  } finally {
    loading.value = false
  }
}

function selectTab(t: Tab) {
  activeTab.value = t
  if (t === 'notes') void loadNotes()
  else if (t === 'feedback') void loadFeedback()
  else void loadQa()
}

// ---- Learn-Notes-Aktionen -------------------------------------------------
async function approveNote(n: LearnNoteRow) {
  try {
    await api.patch(`/api/learn/notes/${n.id}`, { status: 'approved' })
    toast.success('Note freigegeben')
    notes.value = notes.value.filter((x) => x.id !== n.id)
  } catch (err: any) {
    toast.error(err.message || 'Freigabe fehlgeschlagen')
  }
}
async function rejectNote(n: LearnNoteRow) {
  try {
    await api.patch(`/api/learn/notes/${n.id}`, { status: 'rejected' })
    toast.success('Note abgelehnt')
    notes.value = notes.value.filter((x) => x.id !== n.id)
  } catch (err: any) {
    toast.error(err.message || 'Ablehnen fehlgeschlagen')
  }
}

// ---- Feedback → Q&A-Konversion --------------------------------------------
const convertOpen = ref(false)
const convertingFor = ref<FeedbackRow | null>(null)
const draftQuestion = ref('')
const draftAnswer = ref('')

function openConvert(f: FeedbackRow) {
  convertingFor.value = f
  draftQuestion.value = f.priorUserMessage || ''
  draftAnswer.value = f.correction_text || ''
  convertOpen.value = true
}

async function saveAsQa() {
  if (!convertingFor.value) return
  const q = draftQuestion.value.trim()
  const a = draftAnswer.value.trim()
  if (!q || !a) { toast.error('Frage und Antwort erforderlich'); return }

  try {
    await api.post('/api/qa-pairs', {
      question: q,
      answer: a,
      source: 'feedback',
      sourceRef: convertingFor.value.id,
      status: 'approved'
    })
    await api.patch(`/api/chat/feedback/${convertingFor.value.id}`, { status: 'accepted' })
    toast.success('Als Q&A übernommen')
    feedback.value = feedback.value.filter((f) => f.id !== convertingFor.value!.id)
    convertOpen.value = false
    convertingFor.value = null
  } catch (err: any) {
    toast.error(err.message || 'Konvertierung fehlgeschlagen')
  }
}

async function dismissFeedback(f: FeedbackRow) {
  try {
    await api.patch(`/api/chat/feedback/${f.id}`, { status: 'dismissed' })
    toast.success('Feedback verworfen')
    feedback.value = feedback.value.filter((x) => x.id !== f.id)
  } catch (err: any) {
    toast.error(err.message || 'Verwerfen fehlgeschlagen')
  }
}

// ---- Q&A-Aktionen ---------------------------------------------------------
const qaEditOpen = ref(false)
const qaEditing = ref<QaRow | null>(null)
const qaEditQuestion = ref('')
const qaEditAnswer = ref('')

function openQaEdit(pair: QaRow) {
  qaEditing.value = pair
  qaEditQuestion.value = pair.question
  qaEditAnswer.value = pair.answer
  qaEditOpen.value = true
}
async function saveQaEdit() {
  if (!qaEditing.value) return
  try {
    await api.patch(`/api/qa-pairs/${qaEditing.value.id}`, {
      question: qaEditQuestion.value.trim(),
      answer: qaEditAnswer.value.trim()
    })
    toast.success('Q&A aktualisiert')
    qaEditOpen.value = false
    await loadQa()
  } catch (err: any) {
    toast.error(err.message || 'Update fehlgeschlagen')
  }
}
async function deleteQa(pair: QaRow) {
  if (!confirm(`Q&A "${pair.question.slice(0, 50)}..." wirklich löschen?`)) return
  try {
    await api.delete(`/api/qa-pairs/${pair.id}`)
    toast.success('Q&A gelöscht')
    qaPairs.value = qaPairs.value.filter((x) => x.id !== pair.id)
  } catch (err: any) {
    toast.error(err.message || 'Löschen fehlgeschlagen')
  }
}

// ---- Neuer Q&A-Eintrag manuell -------------------------------------------
const newQaOpen = ref(false)
const newQ = ref('')
const newA = ref('')

async function createManualQa() {
  const q = newQ.value.trim()
  const a = newA.value.trim()
  if (!q || !a) { toast.error('Frage und Antwort erforderlich'); return }
  try {
    await api.post('/api/qa-pairs', { question: q, answer: a, source: 'manual', status: 'approved' })
    toast.success('Q&A angelegt')
    newQ.value = ''
    newA.value = ''
    newQaOpen.value = false
    await loadQa()
  } catch (err: any) {
    toast.error(err.message || 'Anlegen fehlgeschlagen')
  }
}

const counts = computed(() => ({
  notes: notes.value.length,
  feedback: feedback.value.length,
  qa: qaPairs.value.length
}))

onMounted(() => selectTab('notes'))
</script>

<template>
  <div>
    <AdminPageHeader
      title="Wissen prüfen"
      description="Learn-Notizen freigeben, Chat-Korrekturen in Q&A überführen, Wissensdatenbank pflegen."
    >
      <template #actions>
        <button v-if="activeTab === 'qa'" class="btn btn-primary" @click="newQaOpen = true">Neues Q&A</button>
      </template>
    </AdminPageHeader>

    <nav class="tabs">
      <button :class="{ active: activeTab === 'notes' }" @click="selectTab('notes')">
        Learn-Notizen <span class="count">{{ counts.notes }}</span>
      </button>
      <button :class="{ active: activeTab === 'feedback' }" @click="selectTab('feedback')">
        Chat-Feedback <span class="count">{{ counts.feedback }}</span>
      </button>
      <button :class="{ active: activeTab === 'qa' }" @click="selectTab('qa')">
        Q&amp;A-Wissen <span class="count">{{ counts.qa }}</span>
      </button>
    </nav>

    <div v-if="loading" class="loading">Lade …</div>

    <!-- Learn-Notes -->
    <section v-if="activeTab === 'notes' && !loading">
      <div v-if="!notes.length" class="empty">Keine offenen Learn-Notes.</div>
      <ul v-else class="review-list">
        <li v-for="n in notes" :key="n.id" class="review-card">
          <div class="review-card-head">
            <strong>{{ n.title }}</strong>
            <span class="badge" :class="`badge-${n.category}`">{{ n.category }}</span>
          </div>
          <p v-if="n.description" class="review-body">{{ n.description }}</p>
          <div class="review-meta">
            <span>Seite: <code>{{ n.page_url }}</code></span>
            <span v-if="n.data_learn_id">Anker: <code>{{ n.data_learn_id }}</code></span>
          </div>
          <div class="review-actions">
            <button class="btn btn-primary" @click="approveNote(n)">Freigeben</button>
            <button class="btn btn-outline" @click="rejectNote(n)">Ablehnen</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Feedback -->
    <section v-if="activeTab === 'feedback' && !loading">
      <div v-if="!feedback.length" class="empty">Kein offenes Feedback.</div>
      <ul v-else class="review-list">
        <li v-for="f in feedback" :key="f.id" class="review-card">
          <div class="review-card-head">
            <span class="rating" :class="{ up: f.rating === 1, down: f.rating === -1 }">
              {{ f.rating === 1 ? '👍' : f.rating === -1 ? '👎' : '·' }}
            </span>
            <span class="ts">{{ new Date(f.created_at).toLocaleString() }}</span>
          </div>
          <div v-if="f.priorUserMessage" class="msg-block">
            <div class="msg-role">Frage</div>
            <div class="msg-content">{{ f.priorUserMessage }}</div>
          </div>
          <div class="msg-block">
            <div class="msg-role">Günther-Antwort</div>
            <div class="msg-content">{{ f.chat_messages?.content }}</div>
          </div>
          <div v-if="f.correction_text" class="msg-block correction">
            <div class="msg-role">Korrektur vom User</div>
            <div class="msg-content">{{ f.correction_text }}</div>
          </div>
          <div class="review-actions">
            <button v-if="f.correction_text" class="btn btn-primary" @click="openConvert(f)">Als Q&A übernehmen</button>
            <button class="btn btn-outline" @click="dismissFeedback(f)">Verwerfen</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Q&A-Wissen -->
    <section v-if="activeTab === 'qa' && !loading">
      <div v-if="!qaPairs.length" class="empty">Keine Q&A-Einträge.</div>
      <ul v-else class="review-list">
        <li v-for="p in qaPairs" :key="p.id" class="review-card">
          <div class="review-card-head">
            <strong>{{ p.question }}</strong>
            <span class="badge" :class="`badge-src-${p.source}`">{{ p.source }}</span>
            <span class="badge" :class="`badge-status-${p.status}`">{{ p.status }}</span>
          </div>
          <p class="review-body">{{ p.answer }}</p>
          <div class="review-actions">
            <button class="btn btn-outline" @click="openQaEdit(p)">Bearbeiten</button>
            <button class="btn btn-danger" @click="deleteQa(p)">Löschen</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Convert Feedback → Q&A -->
    <ModalDialog v-model:open="convertOpen" title="Als Q&A übernehmen" size="md">
      <div class="field">
        <label>Frage</label>
        <textarea v-model="draftQuestion" rows="2" />
      </div>
      <div class="field">
        <label>Antwort (korrekt)</label>
        <textarea v-model="draftAnswer" rows="6" />
      </div>
      <p class="hint">Wird sofort als „approved" gespeichert und ins RAG-Retrieval aufgenommen.</p>
      <template #footer>
        <button class="btn btn-outline" @click="convertOpen = false">Abbrechen</button>
        <button class="btn btn-primary" @click="saveAsQa">Als Q&A speichern</button>
      </template>
    </ModalDialog>

    <!-- Edit Q&A -->
    <ModalDialog v-model:open="qaEditOpen" title="Q&A bearbeiten" size="md">
      <div class="field">
        <label>Frage</label>
        <textarea v-model="qaEditQuestion" rows="2" />
      </div>
      <div class="field">
        <label>Antwort</label>
        <textarea v-model="qaEditAnswer" rows="6" />
      </div>
      <template #footer>
        <button class="btn btn-outline" @click="qaEditOpen = false">Abbrechen</button>
        <button class="btn btn-primary" @click="saveQaEdit">Speichern</button>
      </template>
    </ModalDialog>

    <!-- New manual Q&A -->
    <ModalDialog v-model:open="newQaOpen" title="Neues Q&A-Faktenblatt" size="md">
      <div class="field">
        <label>Frage</label>
        <textarea v-model="newQ" rows="2" placeholder="z.B. Wieviel Abstand braucht ein GFH 031B/1-S?" />
      </div>
      <div class="field">
        <label>Antwort</label>
        <textarea v-model="newA" rows="6" placeholder="Verbindliche Antwort mit Zahlen/Normen" />
      </div>
      <template #footer>
        <button class="btn btn-outline" @click="newQaOpen = false">Abbrechen</button>
        <button class="btn btn-primary" @click="createManualQa">Anlegen</button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 20px;
}
.tabs button {
  background: transparent;
  border: none;
  padding: 10px 14px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-medium);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.tabs button.active {
  color: var(--c-brand-blue);
  border-bottom-color: var(--c-brand-blue);
  font-weight: 600;
}
.tabs .count {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 6px;
  background: var(--c-surface-alt);
  border-radius: 10px;
  font-size: 11px;
  color: var(--c-text-medium);
}
.loading, .empty {
  padding: 40px;
  text-align: center;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
}
.review-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.review-card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
}
.review-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.review-card-head strong { font-family: var(--font-ui); font-size: var(--font-xs); color: var(--c-text-value); }
.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  background: var(--c-surface-alt);
  color: var(--c-text-medium);
}
.badge-element { background: color-mix(in srgb, var(--c-brand-blue) 15%, white); color: var(--c-brand-blue); }
.badge-relations { background: color-mix(in srgb, #5B8C5A 15%, white); color: #5B8C5A; }
.badge-product { background: color-mix(in srgb, #B45309 15%, white); color: #B45309; }
.badge-status-approved { background: color-mix(in srgb, var(--c-success, #16a34a) 15%, white); color: var(--c-success, #16a34a); }
.badge-status-draft { background: color-mix(in srgb, #6b7280 15%, white); color: #6b7280; }
.badge-status-rejected { background: color-mix(in srgb, #dc2626 15%, white); color: #dc2626; }

.review-body { margin: 0 0 10px; font-family: var(--font-ui); font-size: var(--font-2xs); color: var(--c-text-value); line-height: 1.5; }
.review-meta { display: flex; gap: 16px; font-size: 12px; color: var(--c-text-medium); margin-bottom: 10px; }
.review-meta code { font-family: 'DM Mono', monospace; background: var(--c-surface-alt); padding: 1px 5px; border-radius: 3px; }
.review-actions { display: flex; gap: 8px; }

.rating.up { font-size: 20px; }
.rating.down { font-size: 20px; }
.ts { color: var(--c-text-medium); font-size: 12px; }

.msg-block { margin: 8px 0; padding: 8px 10px; background: var(--c-surface-alt); border-radius: 6px; }
.msg-block.correction { background: color-mix(in srgb, #f59e0b 10%, white); border-left: 3px solid #f59e0b; }
.msg-role { font-size: 11px; text-transform: uppercase; color: var(--c-text-medium); margin-bottom: 4px; letter-spacing: 0.5px; }
.msg-content { font-size: 13px; color: var(--c-text-value); white-space: pre-wrap; word-wrap: break-word; }

.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.field label { font-size: 12px; color: var(--c-text-medium); }
.field textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: 13px;
  resize: vertical;
}
.hint { margin: 4px 0 0; font-size: 12px; color: var(--c-text-medium); }
.btn-danger { background: #dc2626; color: white; border: 1px solid #dc2626; }
.btn-danger:hover { background: #b91c1c; }
</style>
