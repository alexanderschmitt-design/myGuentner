<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import ChatProductPreviewCard from './ChatProductPreviewCard.vue'
import type { ProductPreviewData } from './ChatProductPreviewCard.vue'

const props = defineProps<{ data: ProductPreviewData }>()

const emit = defineEmits<{
  (e: 'action', action: 'more-info' | 'configure' | 'contact-sales'): void
}>()

// Build the full bubble text from the product context (no markdown — plain
// text for the typewriter so characters stream cleanly without tag fragments).
const fullText = computed(() => {
  const { productName, category, subcategory, series, description } = props.data
  const catLabel = subcategory ? `${category} · ${subcategory}` : category
  const seriesPart = series ? ` (Baureihe ${series})` : ''

  const lines = [
    `Das ${productName}${seriesPart} ist ein hochwertiges Güntner-Produkt aus dem Bereich ${catLabel}.`,
  ]
  if (description) lines.push(description)
  lines.push('Ich beantworte gerne technische Fragen dazu, führe Sie durch die Konfiguration oder stelle den Kontakt zu unserem Vertriebsteam her — wählen Sie einfach eine Option.')
  return lines.join('\n\n')
})

const displayedText = ref('')
const isTypingComplete = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (typeof window === 'undefined') {
    displayedText.value = fullText.value
    isTypingComplete.value = true
    return
  }
  let index = 0
  const text = fullText.value
  const CHAR_MS = 18

  timer = setInterval(() => {
    if (index < text.length) {
      displayedText.value += text.charAt(index)
      index++
    } else {
      clearInterval(timer!)
      timer = null
      isTypingComplete.value = true
    }
  }, CHAR_MS)
})

onUnmounted(() => {
  if (timer) { clearInterval(timer); timer = null }
})
</script>

<template>
  <div class="pmg">
    <!-- Part 1: Product preview card (no action buttons) -->
    <ChatProductPreviewCard :data="data" :show-actions="false" />

    <!-- Part 2: Blue Günther chat bubble with typewriter effect -->
    <div class="pmg-bubble-row">
      <div class="pmg-avatar" aria-hidden="true">
        <svg viewBox="0 0 56 56" width="18" height="18" fill="none">
          <rect x="10" y="14" width="36" height="30" rx="8" fill="white" opacity="0.9"/>
          <circle cx="22" cy="28" r="2.2" fill="#2666e0"/>
          <circle cx="34" cy="28" r="2.2" fill="#2666e0"/>
          <path d="M23 33.5 Q28 36 33 33.5" stroke="#2666e0" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <div class="pmg-bubble">
        <p class="pmg-bubble-text">{{ displayedText }}<span
          v-if="!isTypingComplete"
          class="pmg-cursor"
          aria-hidden="true"
        >|</span></p>
      </div>
    </div>

    <!-- Part 3: Follow-up bubble + neutral action buttons — fade in after typing -->
    <Transition name="pmg-fade">
      <div v-if="isTypingComplete" class="pmg-after">
        <!-- Second blue bubble: "Was möchten Sie als nächstes tun?" -->
        <div class="pmg-bubble-row">
          <div class="pmg-avatar" aria-hidden="true">
            <svg viewBox="0 0 56 56" width="18" height="18" fill="none">
              <rect x="10" y="14" width="36" height="30" rx="8" fill="white" opacity="0.9"/>
              <circle cx="22" cy="28" r="2.2" fill="#2666e0"/>
              <circle cx="34" cy="28" r="2.2" fill="#2666e0"/>
              <path d="M23 33.5 Q28 36 33 33.5" stroke="#2666e0" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            </svg>
          </div>
          <div class="pmg-bubble">
            <p class="pmg-bubble-text">Was möchten Sie als nächstes tun?</p>
          </div>
        </div>

        <!-- 3 equal neutral buttons -->
        <div class="pmg-actions">
          <button type="button" class="pmg-btn" @click="emit('action', 'more-info')">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 7.5v4M8 5.5h.01"/>
            </svg>
            Weitere Infos anfragen
          </button>
          <button type="button" class="pmg-btn" @click="emit('action', 'configure')">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="8" cy="8" r="2.5"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M11.4 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4"/>
            </svg>
            Produkt konfigurieren
          </button>
          <button type="button" class="pmg-btn" @click="emit('action', 'contact-sales')">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 3h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3z"/><path d="M2 3l6 5 6-5"/>
            </svg>
            Sales kontaktieren
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pmg {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 14px;
}

/* ---- Bubble row: avatar + blue bubble ---- */
.pmg-bubble-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0 0;
}

.pmg-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--c-brand-blue, #2666e0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pmg-bubble {
  flex: 1;
  background: var(--c-brand-blue, #2666e0);
  border-radius: 14px;
  border-top-left-radius: 4px;
  padding: 12px 14px;
  min-height: 44px;
}

.pmg-bubble-text {
  margin: 0;
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-3xs, 12.81px);
  color: #fff;
  line-height: 1.6;
  white-space: pre-line;
}

/* Blinking cursor */
.pmg-cursor {
  display: inline-block;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  animation: pmg-blink 0.9s step-start infinite;
  margin-left: 1px;
}
@keyframes pmg-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* ---- Follow-up section (second bubble + buttons) ---- */
.pmg-after {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ---- Action buttons ---- */
.pmg-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0 0;
}

.pmg-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-sm, 6px);
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-3xs, 12.81px);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  background: var(--c-surface, #fff);
  border: 1px solid var(--c-border, #d8d8d8);
  color: var(--c-text-value, #262326);
  transition: background 0.12s, border-color 0.12s;
  box-sizing: border-box;
}
.pmg-btn:hover {
  background: var(--c-bg, #fafafa);
  border-color: color-mix(in srgb, var(--c-brand-blue, #2666e0) 50%, var(--c-border, #d8d8d8));
}

/* ---- Fade-in transition for buttons ---- */
.pmg-fade-enter-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.pmg-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
