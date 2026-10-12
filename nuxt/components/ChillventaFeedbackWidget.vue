<script setup lang="ts">
const open = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

const form = reactive({
  customer_name: '',
  chatbot_feedback: 0,
  catalog_feedback: 0,
  refrigerant_feedback: 0,
  other_use_cases: '',
  comments: '',
})

// Hover state per rating field
const hover = reactive({
  chatbot_feedback: 0,
  catalog_feedback: 0,
  refrigerant_feedback: 0,
})

function openModal() { open.value = true }

function closeModal() {
  open.value = false
  if (submitted.value) resetForm()
}

function resetForm() {
  Object.assign(form, {
    customer_name: '',
    chatbot_feedback: 0,
    catalog_feedback: 0,
    refrigerant_feedback: 0,
    other_use_cases: '',
    comments: '',
  })
  submitted.value = false
  error.value = ''
}

async function submit() {
  if (!form.customer_name.trim()) return
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{ ok: boolean; error?: string }>('/api/chillventa-feedback', {
      method: 'POST',
      body: { ...form },
    })
    if (!res.ok) throw new Error(res.error || 'Unbekannter Fehler')
    submitted.value = true
  } catch (err: any) {
    error.value = err?.data?.error || err.message || 'Fehler beim Senden'
  } finally {
    submitting.value = false
  }
}

// Close on Escape
onMounted(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})

const STAR_LABELS = ['', 'Schlecht', 'Ausreichend', 'Gut', 'Sehr gut', 'Ausgezeichnet']
</script>

<template>
  <Teleport to="body">
    <!-- Floating trigger button -->
    <button
      class="cv-fab"
      aria-label="Chillventa Feedback geben"
      title="Feedback zur Chillventa-Demo"
      @click="openModal"
    >
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 4h12v10H10l-3 3v-3H4z"/>
        <path d="M10 8v3M8 9.5h4"/>
      </svg>
      <span>Feedback</span>
    </button>

    <!-- Backdrop + Modal -->
    <Transition name="cv-backdrop">
      <div v-if="open" class="cv-backdrop" @click.self="closeModal" aria-modal="true" role="dialog" aria-label="Chillventa Feedback">
        <Transition name="cv-modal">
          <div v-if="open" class="cv-modal">
            <!-- Modal header -->
            <div class="cv-modal-header">
              <div class="cv-modal-header-left">
                <div class="cv-modal-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 2.5l2.5 5.1 5.6.8-4.05 3.95.96 5.6L10 15.3l-5.01 2.65.96-5.6L1.9 8.4l5.6-.8L10 2.5z"/>
                  </svg>
                </div>
                <div>
                  <div class="cv-modal-badge">Chillventa 2024 · Nürnberg</div>
                  <h2 class="cv-modal-title">Ihr Feedback zählt</h2>
                </div>
              </div>
              <button class="cv-modal-close" aria-label="Schließen" @click="closeModal">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round">
                  <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
                </svg>
              </button>
            </div>

            <!-- Success -->
            <div v-if="submitted" class="cv-success">
              <div class="cv-success-icon">✓</div>
              <h3>Vielen Dank!</h3>
              <p>Ihr Feedback wurde gespeichert.</p>
              <div class="cv-success-actions">
                <button class="cv-btn cv-btn-outline" @click="resetForm">Weiteres Feedback</button>
                <button class="cv-btn cv-btn-primary" @click="closeModal">Schließen</button>
              </div>
            </div>

            <!-- Form -->
            <form v-else class="cv-form" @submit.prevent="submit">
              <!-- Name -->
              <div class="cv-field">
                <label class="cv-label">
                  <span>👤</span> Name / Unternehmen <span class="cv-required">*</span>
                </label>
                <input
                  v-model="form.customer_name"
                  type="text"
                  class="cv-input"
                  placeholder="z.B. Max Mustermann, Kälte GmbH"
                  required
                  autocomplete="off"
                />
              </div>

              <!-- Chatbot -->
              <div class="cv-field">
                <label class="cv-label"><span>🤖</span> Chatbot Günther</label>
                <div class="cv-stars-wrap">
                  <div class="cv-stars">
                    <button
                      v-for="n in 5" :key="n"
                      type="button"
                      class="cv-star"
                      :class="{ filled: n <= (hover.chatbot_feedback || form.chatbot_feedback) }"
                      :aria-label="`${n} von 5 Sternen`"
                      @mouseenter="hover.chatbot_feedback = n"
                      @mouseleave="hover.chatbot_feedback = 0"
                      @click="form.chatbot_feedback = form.chatbot_feedback === n ? 0 : n"
                    >
                      <svg viewBox="0 0 20 20" width="32" height="32">
                        <path d="M10 2l2.4 5.3H18l-4.5 3.4 1.7 5.6L10 13.3l-5.2 3 1.7-5.6L2 7.3h5.6z" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <span class="cv-stars-label">{{ STAR_LABELS[hover.chatbot_feedback || form.chatbot_feedback] || '—' }}</span>
                </div>
              </div>

              <!-- Catalog -->
              <div class="cv-field">
                <label class="cv-label"><span>📖</span> Produktkonfigurator</label>
                <div class="cv-stars-wrap">
                  <div class="cv-stars">
                    <button
                      v-for="n in 5" :key="n"
                      type="button"
                      class="cv-star"
                      :class="{ filled: n <= (hover.catalog_feedback || form.catalog_feedback) }"
                      :aria-label="`${n} von 5 Sternen`"
                      @mouseenter="hover.catalog_feedback = n"
                      @mouseleave="hover.catalog_feedback = 0"
                      @click="form.catalog_feedback = form.catalog_feedback === n ? 0 : n"
                    >
                      <svg viewBox="0 0 20 20" width="32" height="32">
                        <path d="M10 2l2.4 5.3H18l-4.5 3.4 1.7 5.6L10 13.3l-5.2 3 1.7-5.6L2 7.3h5.6z" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <span class="cv-stars-label">{{ STAR_LABELS[hover.catalog_feedback || form.catalog_feedback] || '—' }}</span>
                </div>
              </div>

              <!-- Refrigerant -->
              <div class="cv-field">
                <label class="cv-label"><span>❄️</span> Kältemittel-Beratung</label>
                <div class="cv-stars-wrap">
                  <div class="cv-stars">
                    <button
                      v-for="n in 5" :key="n"
                      type="button"
                      class="cv-star"
                      :class="{ filled: n <= (hover.refrigerant_feedback || form.refrigerant_feedback) }"
                      :aria-label="`${n} von 5 Sternen`"
                      @mouseenter="hover.refrigerant_feedback = n"
                      @mouseleave="hover.refrigerant_feedback = 0"
                      @click="form.refrigerant_feedback = form.refrigerant_feedback === n ? 0 : n"
                    >
                      <svg viewBox="0 0 20 20" width="32" height="32">
                        <path d="M10 2l2.4 5.3H18l-4.5 3.4 1.7 5.6L10 13.3l-5.2 3 1.7-5.6L2 7.3h5.6z" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <span class="cv-stars-label">{{ STAR_LABELS[hover.refrigerant_feedback || form.refrigerant_feedback] || '—' }}</span>
                </div>
              </div>

              <!-- Other use cases -->
              <div class="cv-field">
                <label class="cv-label"><span>💡</span> Weitere Anwendungsfälle</label>
                <input
                  v-model="form.other_use_cases"
                  type="text"
                  class="cv-input"
                  placeholder="z.B. Serviceplanung, Schulungen …"
                  autocomplete="off"
                />
              </div>

              <!-- Comments -->
              <div class="cv-field">
                <label class="cv-label"><span>✍️</span> Anmerkungen &amp; Verbesserungsvorschläge</label>
                <textarea
                  v-model="form.comments"
                  class="cv-textarea"
                  placeholder="Was hat Ihnen gut gefallen? Was sollten wir verbessern?"
                  rows="3"
                />
              </div>

              <p v-if="error" class="cv-error">{{ error }}</p>

              <button
                type="submit"
                class="cv-btn cv-btn-primary"
                :disabled="submitting || !form.customer_name.trim()"
              >
                {{ submitting ? 'Wird gesendet …' : 'Feedback absenden' }}
              </button>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Floating Action Button ────────────────────────────────────────────────── */
.cv-fab {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--c-brand-blue, #0078BE);
  color: white;
  border: none;
  border-radius: 999px;
  font-family: var(--font-ui, 'DM Sans', sans-serif);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 120, 190, 0.35);
  transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
}
.cv-fab:hover {
  background: #005f9e;
  box-shadow: 0 6px 20px rgba(0, 120, 190, 0.45);
  transform: translateY(-2px);
}

/* ── Backdrop ──────────────────────────────────────────────────────────────── */
.cv-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* ── Modal ─────────────────────────────────────────────────────────────────── */
.cv-modal {
  width: 100%;
  max-width: 560px;
  max-height: 90dvh;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
}

/* Header */
.cv-modal-header {
  background: linear-gradient(135deg, #003865 0%, #0078be 100%);
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}
.cv-modal-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cv-modal-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cv-modal-badge {
  font-family: var(--font-ui, sans-serif);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 3px;
}
.cv-modal-title {
  font-family: var(--font-ui, sans-serif);
  font-size: 17px;
  font-weight: 700;
  color: white;
  margin: 0;
}
.cv-modal-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.cv-modal-close:hover { background: rgba(255, 255, 255, 0.25); }

/* Success */
.cv-success {
  padding: 40px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.cv-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #e8f5ee;
  color: #2a7d4f;
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.cv-success h3 {
  font-family: var(--font-ui, sans-serif);
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}
.cv-success p {
  font-family: var(--font-ui, sans-serif);
  font-size: 14px;
  color: #666;
  margin: 0;
}
.cv-success-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Form */
.cv-form {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}

.cv-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cv-label {
  font-family: var(--font-ui, sans-serif);
  font-size: 12.5px;
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cv-required { color: #c0392b; }

.cv-input,
.cv-textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid #dde3ea;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  color: #1a1a1a;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cv-input:focus,
.cv-textarea:focus {
  border-color: #0078be;
  box-shadow: 0 0 0 3px rgba(0, 120, 190, 0.12);
}
.cv-input::placeholder,
.cv-textarea::placeholder { color: #aab4bf; }

/* Star rating */
.cv-stars-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cv-stars {
  display: flex;
  gap: 2px;
}
.cv-star {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: transform 0.1s;
}
.cv-star:hover { transform: scale(1.15); }
.cv-star svg {
  stroke: #d1d5db;
  fill: none;
  transition: stroke 0.12s, fill 0.12s;
}
.cv-star.filled svg {
  stroke: #f59e0b;
  fill: #f59e0b;
}
.cv-stars:hover .cv-star svg {
  stroke: #d1d5db;
  fill: none;
}
.cv-stars:hover .cv-star:hover svg,
.cv-stars:hover .cv-star:hover ~ .cv-star svg { /* handled via :class */ }
.cv-star.filled svg { stroke: #f59e0b; fill: #f59e0b; }
.cv-stars-label {
  font-family: var(--font-ui, sans-serif);
  font-size: 12.5px;
  font-weight: 600;
  color: #555;
  min-width: 90px;
}

/* Buttons */
.cv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  border: none;
}
.cv-btn-primary {
  background: #0078be;
  color: white;
  width: 100%;
}
.cv-btn-primary:hover:not(:disabled) { background: #005f9e; }
.cv-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.cv-btn-outline {
  background: white;
  color: #0078be;
  border: 1.5px solid #0078be;
}
.cv-btn-outline:hover { background: rgba(0, 120, 190, 0.06); }

.cv-error {
  font-size: 12.5px;
  color: #c0392b;
  padding: 9px 12px;
  background: #fdf2f2;
  border-radius: 7px;
  border: 1px solid #f5c6c6;
  margin: 0;
}

/* ── Transitions ───────────────────────────────────────────────────────────── */
.cv-backdrop-enter-active,
.cv-backdrop-leave-active { transition: opacity 0.22s ease; }
.cv-backdrop-enter-from,
.cv-backdrop-leave-to { opacity: 0; }

.cv-modal-enter-active { transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1); }
.cv-modal-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.cv-modal-enter-from { opacity: 0; transform: translateY(20px) scale(0.96); }
.cv-modal-leave-to   { opacity: 0; transform: translateY(10px) scale(0.97); }

@media (max-width: 600px) {
  .cv-fab { bottom: 16px; left: 16px; padding: 9px 13px; font-size: 12.5px; }
  .cv-modal { max-height: 95dvh; border-radius: 14px 14px 0 0; }
  .cv-backdrop { align-items: flex-end; padding: 0; }
  .cv-rating-btn { min-width: 72px; padding: 8px 4px; font-size: 10.5px; }
}
</style>
