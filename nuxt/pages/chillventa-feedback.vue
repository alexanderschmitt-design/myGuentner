<script setup lang="ts">
definePageMeta({ auth: false, layout: false })
useHead({ title: 'Chillventa 2024 — Feedback' })

const RATINGS = ['Sehr hilfreich', 'Hilfreich', 'Okay', 'Nicht relevant'] as const
type Rating = typeof RATINGS[number]

const form = reactive({
  customer_name: '',
  chatbot_feedback: '' as Rating | '',
  catalog_feedback: '' as Rating | '',
  refrigerant_feedback: '' as Rating | '',
  other_use_cases: '',
  comments: '',
})

const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

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

function reset() {
  Object.assign(form, {
    customer_name: '',
    chatbot_feedback: '',
    catalog_feedback: '',
    refrigerant_feedback: '',
    other_use_cases: '',
    comments: '',
  })
  submitted.value = false
  error.value = ''
}

const ratingEmoji: Record<Rating, string> = {
  'Sehr hilfreich': '😊',
  'Hilfreich': '🙂',
  'Okay': '😐',
  'Nicht relevant': '🤷',
}
</script>

<template>
  <div class="cv-page">
    <div class="cv-card">
      <!-- Header -->
      <div class="cv-header">
        <div class="cv-logo">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l2.4 7h7.6l-6 4.5 2.3 7L12 17l-6.3 3.5 2.3-7L2 9h7.6z"/>
          </svg>
        </div>
        <div>
          <div class="cv-badge">Chillventa 2024 · Nürnberg</div>
          <h1 class="cv-title">Ihr Feedback zählt</h1>
          <p class="cv-subtitle">Wie erleben Sie die myGüntner-Demo? Ihre Meinung hilft uns, das Produkt weiterzuentwickeln.</p>
        </div>
      </div>

      <!-- Success State -->
      <div v-if="submitted" class="cv-success">
        <div class="cv-success-icon">✓</div>
        <h2>Vielen Dank!</h2>
        <p>Ihr Feedback wurde gespeichert. Wir freuen uns über Ihr Interesse.</p>
        <button class="cv-btn cv-btn-outline" @click="reset">Weiteres Feedback eingeben</button>
      </div>

      <!-- Form -->
      <form v-else class="cv-form" @submit.prevent="submit">
        <!-- Name -->
        <div class="cv-field">
          <label class="cv-label">
            <span class="cv-label-icon">👤</span>
            Ihr Name / Unternehmen <span class="cv-required">*</span>
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
          <label class="cv-label">
            <span class="cv-label-icon">🤖</span>
            Chatbot (Günther) — Wie nützlich war der Assistent für Sie?
          </label>
          <div class="cv-rating-group">
            <button
              v-for="r in RATINGS"
              :key="r"
              type="button"
              class="cv-rating-btn"
              :class="{ active: form.chatbot_feedback === r }"
              @click="form.chatbot_feedback = form.chatbot_feedback === r ? '' : r"
            >
              <span class="cv-rating-emoji">{{ ratingEmoji[r] }}</span>
              <span>{{ r }}</span>
            </button>
          </div>
        </div>

        <!-- Catalog -->
        <div class="cv-field">
          <label class="cv-label">
            <span class="cv-label-icon">📖</span>
            Produktkonfigurator — War die Produktsuche / Auswahl hilfreich?
          </label>
          <div class="cv-rating-group">
            <button
              v-for="r in RATINGS"
              :key="r"
              type="button"
              class="cv-rating-btn"
              :class="{ active: form.catalog_feedback === r }"
              @click="form.catalog_feedback = form.catalog_feedback === r ? '' : r"
            >
              <span class="cv-rating-emoji">{{ ratingEmoji[r] }}</span>
              <span>{{ r }}</span>
            </button>
          </div>
        </div>

        <!-- Refrigerant -->
        <div class="cv-field">
          <label class="cv-label">
            <span class="cv-label-icon">❄️</span>
            Kältemittel-Beratung — Wie bewerten Sie die Kältemittel-Empfehlungen?
          </label>
          <div class="cv-rating-group">
            <button
              v-for="r in RATINGS"
              :key="r"
              type="button"
              class="cv-rating-btn"
              :class="{ active: form.refrigerant_feedback === r }"
              @click="form.refrigerant_feedback = form.refrigerant_feedback === r ? '' : r"
            >
              <span class="cv-rating-emoji">{{ ratingEmoji[r] }}</span>
              <span>{{ r }}</span>
            </button>
          </div>
        </div>

        <!-- Other use cases -->
        <div class="cv-field">
          <label class="cv-label">
            <span class="cv-label-icon">💡</span>
            Weitere Anwendungsfälle — Für welche Bereiche würden Sie myGüntner nutzen?
          </label>
          <input
            v-model="form.other_use_cases"
            type="text"
            class="cv-input"
            placeholder="z.B. Serviceplanung, Schulungen, Angebotserstellung …"
            autocomplete="off"
          />
        </div>

        <!-- Comments -->
        <div class="cv-field">
          <label class="cv-label">
            <span class="cv-label-icon">✍️</span>
            Anmerkungen &amp; Verbesserungsvorschläge
          </label>
          <textarea
            v-model="form.comments"
            class="cv-textarea"
            placeholder="Was hat Ihnen gut gefallen? Was sollten wir verbessern?"
            rows="4"
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
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>

<style scoped>
.cv-page {
  min-height: 100dvh;
  background: linear-gradient(145deg, #003865 0%, #0055a5 55%, #0078be 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px 48px;
}

.cv-card {
  width: 100%;
  max-width: 680px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
}

/* Header */
.cv-header {
  background: linear-gradient(135deg, #003865 0%, #0078be 100%);
  padding: 28px 32px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.cv-logo {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.cv-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.cv-title {
  font-size: 22px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
  margin-bottom: 6px;
}
.cv-subtitle {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.5;
}

/* Success */
.cv-success {
  padding: 48px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.cv-success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #e6f4ea;
  color: #2a7d4f;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.cv-success h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
}
.cv-success p {
  font-size: 14px;
  color: #666;
  max-width: 360px;
}

/* Form */
.cv-form {
  padding: 28px 32px 36px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cv-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cv-label {
  font-size: 13.5px;
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 7px;
  line-height: 1.4;
}
.cv-label-icon { font-size: 16px; }
.cv-required { color: #c0392b; }

.cv-input,
.cv-textarea {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #dde3ea;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14.5px;
  color: #1a1a1a;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  resize: vertical;
}
.cv-input:focus,
.cv-textarea:focus {
  border-color: #0078be;
  box-shadow: 0 0 0 3px rgba(0, 120, 190, 0.12);
}
.cv-input::placeholder,
.cv-textarea::placeholder { color: #aab4bf; }

/* Rating buttons */
.cv-rating-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cv-rating-btn {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 10px;
  border: 1.5px solid #dde3ea;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: #444;
  transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.1s;
  text-align: center;
}
.cv-rating-btn:hover {
  border-color: #0078be;
  background: rgba(0, 120, 190, 0.04);
  transform: translateY(-1px);
}
.cv-rating-btn.active {
  border-color: #0078be;
  background: rgba(0, 120, 190, 0.1);
  color: #0078be;
  font-weight: 600;
}
.cv-rating-emoji { font-size: 22px; }

/* Buttons */
.cv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 15px;
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
.cv-btn-primary:hover:not(:disabled) {
  background: #005f9e;
  transform: translateY(-1px);
}
.cv-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cv-btn-outline {
  background: white;
  color: #0078be;
  border: 1.5px solid #0078be;
  margin-top: 4px;
}
.cv-btn-outline:hover {
  background: rgba(0, 120, 190, 0.06);
}

.cv-error {
  font-size: 13px;
  color: #c0392b;
  padding: 10px 14px;
  background: #fdf2f2;
  border-radius: 8px;
  border: 1px solid #f5c6c6;
}

@media (max-width: 480px) {
  .cv-page { padding: 16px 12px 40px; }
  .cv-header { padding: 22px 20px; flex-direction: column; gap: 12px; }
  .cv-form { padding: 20px 20px 28px; }
  .cv-rating-btn { min-width: 90px; padding: 10px 6px; }
}
</style>
