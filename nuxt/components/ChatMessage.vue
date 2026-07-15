<script setup lang="ts">
/**
 * ChatMessage — renders one chat turn (user or assistant).
 *
 * Assistant messages support Markdown via `marked` + sanitisation with
 * `dompurify`, so LLM-authored content can safely land in the DOM.
 * User turns render as plain text.
 */
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { RagSource } from '~/composables/useChatStream'
import ChatSourceChip from './ChatSourceChip.vue'

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
  streaming?: boolean
}>()

const emit = defineEmits<{ (e: 'openSource', src: RagSource): void }>()

marked.setOptions({ breaks: true, gfm: true })

const html = computed(() => {
  if (props.role !== 'assistant') return ''
  const raw = marked.parse(props.content || '') as string
  // DOMPurify is client-only; on SSR return the raw HTML (the widget is
  // never rendered on the server anyway).
  if (typeof window === 'undefined') return raw
  return DOMPurify.sanitize(raw)
})
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
</style>
