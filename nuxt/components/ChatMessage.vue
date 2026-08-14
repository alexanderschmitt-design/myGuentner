<script setup lang="ts">
/**
 * ChatMessage — renders one chat turn (user or assistant).
 *
 * Assistant messages support Markdown via `marked` + sanitisation with
 * `dompurify`, so LLM-authored content can safely land in the DOM.
 * User turns render as plain text.
 *
 * Feedback: bei gesetzter `messageId` (nur assistant-Turns nach Persistenz)
 * werden 👍/👎-Buttons + Korrektur-Toggle angezeigt. Klicks feuern das
 * `feedback`-Event nach oben — die tatsächliche API-Kommunikation macht
 * ChatDock.
 */
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { RagSource } from '~/composables/useChatStream'
import ChatSourceChip from './ChatSourceChip.vue'

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
  streaming?: boolean
  messageId?: string | null
}>()

export interface FeedbackPayload {
  messageId: string
  rating: -1 | 0 | 1
  correctionText?: string
}

const emit = defineEmits<{
  (e: 'openSource', src: RagSource): void
  (e: 'feedback', payload: FeedbackPayload): void
}>()

marked.setOptions({ breaks: true, gfm: true })

const html = computed(() => {
  if (props.role !== 'assistant') return ''
  const raw = marked.parse(props.content || '') as string
  if (typeof window === 'undefined') return raw
  return DOMPurify.sanitize(raw)
})

const currentRating = ref<-1 | 0 | 1 | null>(null)
const showCorrection = ref(false)
const correctionText = ref('')
const saving = ref(false)
const savedAt = ref<number | null>(null)

function rate(r: -1 | 1) {
  if (!props.messageId || props.streaming) return
  currentRating.value = currentRating.value === r ? 0 : r
  if (currentRating.value === -1) showCorrection.value = true
  if (currentRating.value !== 0) sendFeedback()
}

function sendFeedback() {
  if (!props.messageId || currentRating.value === null) return
  saving.value = true
  emit('feedback', {
    messageId: props.messageId,
    rating: currentRating.value,
    correctionText: correctionText.value.trim() || undefined
  })
  // Optimistic — parent will confirm via a prop refresh later if needed
  setTimeout(() => { saving.value = false; savedAt.value = Date.now() }, 300)
}

function submitCorrection() {
  if (!props.messageId) return
  currentRating.value = -1
  sendFeedback()
  showCorrection.value = false
}

const canFeedback = computed(() => props.role === 'assistant' && !!props.messageId && !props.streaming)
</script>

<template>
  <div class="chat-msg" :class="`chat-msg-${role}`">
    <div v-if="role === 'user'" class="chat-msg-bubble">{{ content }}</div>
    <div v-else class="chat-msg-bubble">
      <div class="chat-msg-md" v-html="html" />
      <span v-if="streaming" class="chat-msg-cursor" aria-hidden="true">▍</span>
      <div v-if="sources && sources.length" class="chat-msg-sources">
        <ChatSourceChip
          v-for="(s, i) in sources"
          :key="i"
          :index="i + 1"
          :source="s"
          @open="emit('openSource', $event)"
        />
      </div>
      <div v-if="canFeedback" class="chat-msg-feedback">
        <button
          type="button"
          class="fb-btn"
          :class="{ active: currentRating === 1 }"
          :aria-pressed="currentRating === 1"
          title="Hilfreich"
          @click="rate(1)"
        >👍</button>
        <button
          type="button"
          class="fb-btn"
          :class="{ active: currentRating === -1 }"
          :aria-pressed="currentRating === -1"
          title="Nicht hilfreich"
          @click="rate(-1)"
        >👎</button>
        <button
          v-if="currentRating === -1 || showCorrection"
          type="button"
          class="fb-link"
          @click="showCorrection = !showCorrection"
        >{{ showCorrection ? 'Korrektur abbrechen' : 'Korrektur schreiben' }}</button>
        <span v-if="savedAt" class="fb-saved">gespeichert</span>
      </div>
      <div v-if="canFeedback && showCorrection" class="chat-msg-correction">
        <textarea
          v-model="correctionText"
          class="fb-textarea"
          rows="3"
          placeholder="Das ist falsch — richtig wäre …"
        />
        <div class="fb-actions">
          <button
            type="button"
            class="fb-submit"
            :disabled="!correctionText.trim() || saving"
            @click="submitCorrection"
          >Korrektur senden</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-msg {
  display: flex;
  margin-bottom: 14px;
}
.chat-msg-user { justify-content: flex-end; }
.chat-msg-assistant { justify-content: flex-start; }

.chat-msg-bubble {
  max-width: 92%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: 1.5;
  color: var(--c-text-value);
  word-wrap: break-word;
}
.chat-msg-user .chat-msg-bubble {
  background: var(--c-brand-blue);
  color: white;
  border-bottom-right-radius: 4px;
}
.chat-msg-assistant .chat-msg-bubble {
  background: var(--c-surface-alt);
  border-bottom-left-radius: 4px;
}

.chat-msg-md :deep(p) { margin: 0 0 8px; }
.chat-msg-md :deep(p:last-child) { margin-bottom: 0; }
.chat-msg-md :deep(ul), .chat-msg-md :deep(ol) { margin: 4px 0 8px; padding-left: 20px; }
.chat-msg-md :deep(li) { margin: 2px 0; }
.chat-msg-md :deep(code) {
  padding: 1px 5px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  font-family: 'DM Mono', monospace;
  font-size: 90%;
}
.chat-msg-md :deep(pre) {
  margin: 6px 0;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'DM Mono', monospace;
  font-size: 90%;
}
.chat-msg-md :deep(pre code) { background: transparent; padding: 0; }
.chat-msg-md :deep(a) { color: var(--c-brand-blue); }
.chat-msg-md :deep(strong) { font-weight: 600; }

.chat-msg-cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--c-brand-blue);
  animation: cursor-blink 1s steps(2) infinite;
}
@keyframes cursor-blink { 50% { opacity: 0; } }

.chat-msg-sources {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chat-msg-feedback {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.fb-btn {
  background: transparent;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.2;
  transition: background 120ms;
}
.fb-btn:hover { background: rgba(0,0,0,0.05); }
.fb-btn.active { background: var(--c-brand-blue); border-color: var(--c-brand-blue); color: white; }
.fb-link {
  background: transparent;
  border: none;
  color: var(--c-brand-blue);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  text-decoration: underline;
}
.fb-saved {
  color: var(--c-text-muted, #666);
  font-style: italic;
}
.chat-msg-correction {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fb-textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  resize: vertical;
}
.fb-actions { display: flex; justify-content: flex-end; }
.fb-submit {
  background: var(--c-brand-blue);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.fb-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
