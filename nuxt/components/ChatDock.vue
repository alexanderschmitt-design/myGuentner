<script setup lang="ts">
/**
 * ChatDock — global chatbot widget (FAB + slide-in drawer).
 * Mounted once from the default layout so it appears on every page.
 * Streams answers from POST /api/chat via useChatStream and renders
 * sources as clickable numbered chips.
 */
import { computed, nextTick, ref, watch } from 'vue'
import ChatMessage from './ChatMessage.vue'
import ModalDialog from './ModalDialog.vue'
import type { RagSource } from '~/composables/useChatStream'

const isOpen = ref(false)
const inputValue = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
}

const history = ref<HistoryEntry[]>([])
const stream = useChatStream()

// Live assistant message during streaming (built from stream refs)
const liveAssistant = computed<HistoryEntry | null>(() => {
  if (!stream.isStreaming.value && !stream.text.value) return null
  return {
    role: 'assistant',
    content: stream.text.value,
    sources: stream.sources.value
  }
})

// Full transcript = history + live
const transcript = computed<HistoryEntry[]>(() => {
  return liveAssistant.value ? [...history.value, liveAssistant.value] : history.value
})

const sourceModal = ref(false)
const openedSource = ref<RagSource | null>(null)

function openSource(src: RagSource) {
  openedSource.value = src
  sourceModal.value = true
}

function scrollToEnd() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

// Auto-scroll while streaming
watch([() => stream.text.value, () => transcript.value.length], scrollToEnd)

async function submit() {
  const q = inputValue.value.trim()
  if (!q || stream.isStreaming.value) return

  // Append user turn to history
  history.value = [...history.value, { role: 'user', content: q }]
  inputValue.value = ''
  scrollToEnd()

  // Build API history (exclude the latest user turn — /api/chat receives
  // it separately in the `query` field)
  const apiHistory = history.value
    .slice(0, -1)
    .map((h) => ({ role: h.role, content: h.content }))

  await stream.send({
    query: q,
    language: 'de',
    history: apiHistory
  })

  // On stream done: commit the assistant turn to history
  if (stream.text.value) {
    history.value = [
      ...history.value,
      {
        role: 'assistant',
        content: stream.text.value,
        sources: stream.sources.value.slice()
      }
    ]
  }
  stream.reset()
  scrollToEnd()
}

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => inputRef.value?.focus())
    scrollToEnd()
  } else {
    stream.abort()
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function clearHistory() {
  history.value = []
  stream.reset()
}
</script>

<template>
  <div class="chat-dock">
    <!-- Slide-in drawer -->
    <transition name="chat-drawer">
      <aside v-if="isOpen" class="chat-drawer" aria-label="Chat mit Bella">
        <header class="chat-drawer-head">
          <div class="chat-drawer-title">
            <span class="chat-drawer-dot" aria-hidden="true"></span>
            <strong>Bella</strong>
            <span class="chat-drawer-subtitle">Güntner Assistent</span>
          </div>
          <div class="chat-drawer-head-actions">
            <button
              v-if="history.length"
              type="button"
              class="chat-drawer-icon-btn"
              title="Chat zurücksetzen"
              @click="clearHistory"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h10M6 6v7a1 1 0 001 1h2a1 1 0 001-1V6M5 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
            <button type="button" class="chat-drawer-icon-btn" aria-label="Schließen" @click="toggle">
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor"
                      stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </header>

        <div ref="bodyRef" class="chat-drawer-body">
          <div v-if="!transcript.length" class="chat-drawer-empty">
            <p><strong>Willkommen 👋</strong></p>
            <p>Ich bin Bella, dein Güntner-Assistent. Frag mich nach Produkten, Auslegung oder Dokumenten aus dem DMS.</p>
          </div>
          <ChatMessage
            v-for="(msg, i) in transcript"
            :key="i"
            :role="msg.role"
            :content="msg.content"
            :sources="msg.sources"
            :streaming="i === transcript.length - 1 && stream.isStreaming.value && msg.role === 'assistant'"
            @open-source="openSource"
          />
          <p v-if="stream.error.value" class="chat-drawer-error">
            {{ stream.error.value }}
          </p>
        </div>

        <footer class="chat-drawer-input">
          <textarea
            ref="inputRef"
            v-model="inputValue"
            placeholder="Frage stellen…"
            rows="2"
            :disabled="stream.isStreaming.value"
            @keydown="onKey"
          />
          <button
            type="button"
            class="chat-drawer-send"
            :disabled="!inputValue.trim() || stream.isStreaming.value"
            @click="submit"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor"
                 stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 8l12-5-4 12-2-5-6-2z"/>
            </svg>
          </button>
        </footer>
      </aside>
    </transition>

    <!-- Floating action button -->
    <button type="button" class="chat-fab" :class="{ 'is-open': isOpen }" aria-label="Chat öffnen" @click="toggle">
      <svg v-if="!isOpen" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 5h16v11H8l-4 4V5z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="22" height="22">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Source detail modal -->
    <ModalDialog v-model:open="sourceModal" title="Quelle" size="md">
      <template v-if="openedSource">
        <p><strong>{{ openedSource.metadata?.documentName || 'Dokument' }}</strong></p>
        <p v-if="openedSource.metadata?.dmsFilename" class="src-meta">
          DMS: {{ openedSource.metadata.dmsFilename }}
          <span v-if="openedSource.metadata.dmsVersion"> (v{{ openedSource.metadata.dmsVersion }})</span>
        </p>
        <p v-if="openedSource.metadata?.chunkIndex != null" class="src-meta">
          Chunk #{{ openedSource.metadata.chunkIndex }}
          <span v-if="openedSource.score"> · Score {{ openedSource.score.toFixed(3) }}</span>
        </p>
        <pre class="src-body">{{ openedSource.text }}</pre>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.chat-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 90;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--c-brand-blue);
  color: white;
  box-shadow: 0 8px 24px rgba(38, 102, 224, 0.35);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.chat-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(38, 102, 224, 0.45); }
.chat-fab.is-open { background: var(--c-text-medium); }

.chat-drawer {
  position: fixed;
  right: 24px;
  bottom: 88px;
  z-index: 95;
  width: 400px;
  max-width: calc(100vw - 48px);
  height: 560px;
  max-height: calc(100vh - 120px);
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.20);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border-card);
  background: var(--c-bg);
}
.chat-drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
}
.chat-drawer-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-success, #2E7D4F);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-success, #2E7D4F) 20%, transparent);
}
.chat-drawer-subtitle {
  color: var(--c-text-light2);
  font-size: var(--font-3xs);
}
.chat-drawer-head-actions { display: flex; gap: 4px; }
.chat-drawer-icon-btn {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 4px;
  color: var(--c-text-medium);
  cursor: pointer;
}
.chat-drawer-icon-btn:hover { background: var(--c-border-card); color: var(--c-text); }

.chat-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 6px;
}
.chat-drawer-empty {
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  padding: 12px;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.chat-drawer-empty p { margin: 0 0 8px; }
.chat-drawer-empty p:last-child { margin-bottom: 0; }
.chat-drawer-error {
  color: var(--c-error, #B33A3A);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  margin: 8px 4px 0;
}

.chat-drawer-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--c-border-card);
  background: white;
}
.chat-drawer-input textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: 1.4;
  color: var(--c-text-value);
  resize: none;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.chat-drawer-input textarea:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.chat-drawer-input textarea:disabled { opacity: 0.6; background: var(--c-bg); }

.chat-drawer-send {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-xs);
  background: var(--c-brand-blue);
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-drawer-send:disabled { opacity: 0.4; cursor: not-allowed; }

.chat-drawer-enter-active,
.chat-drawer-leave-active { transition: transform 0.22s ease, opacity 0.22s ease; }
.chat-drawer-enter-from,
.chat-drawer-leave-to { transform: translateY(12px); opacity: 0; }

.src-meta {
  margin: 4px 0;
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.src-body {
  margin: 8px 0 0;
  padding: 10px 12px;
  background: var(--c-bg);
  border-radius: var(--radius-xs);
  font-family: 'DM Mono', monospace;
  font-size: var(--font-3xs);
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}
</style>
