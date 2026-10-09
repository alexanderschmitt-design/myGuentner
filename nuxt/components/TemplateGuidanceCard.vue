<script setup lang="ts">
export interface TemplateGuidanceData {
  templateName: string
  categoryTitle: string
  paramCount: number
}

defineProps<{ data: TemplateGuidanceData }>()
const emit = defineEmits<{ (e: 'ask'): void }>()
</script>

<template>
  <div class="tgc">
    <!-- Header badge -->
    <div class="tgc-head">
      <svg class="tgc-head-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M8 1l1.3 3.7L13 6l-3.7 1.3L8 11 6.7 7.3 3 6l3.7-1.3L8 1zM13 10l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7L13 10z"/>
      </svg>
      <span class="tgc-head-label">TEMPLATE GUIDANCE</span>
    </div>

    <!-- Product name headline -->
    <h3 class="tgc-title">{{ data.templateName }}</h3>

    <!-- Brief context line -->
    <p class="tgc-context">
      <strong>{{ data.categoryTitle || 'Product category' }}</strong> template applied —
      {{ data.paramCount }} parameters pre-filled in this configuration step.
    </p>

    <hr class="tgc-divider" />

    <!-- Configuration hints -->
    <div class="tgc-hints">
      <div class="tgc-hints-head">
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M8 4.5v4M8 10.5v1"/>
        </svg>
        <span>What to review in this step</span>
      </div>
      <ul class="tgc-hint-list">
        <li>All pre-filled values are editable — override anything that doesn't match your project.</li>
        <li><strong>Cooling Capacity:</strong> Confirm the target load matches your system requirements.</li>
        <li><strong>Medium &amp; Refrigerant:</strong> Verify fluid type, concentration, and temperature levels.</li>
        <li><strong>Defrost &amp; Air Conditions:</strong> Check inlet temperature and defrost method suit your installation.</li>
      </ul>
    </div>

    <!-- Help note -->
    <div class="tgc-note">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
           class="tgc-note-icon" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5"/>
        <path d="M6.5 6.3c0-1 .7-1.8 1.7-1.8s1.7.8 1.7 1.8c0 .8-.5 1.4-1.2 1.7L8 9v.5"/>
        <circle cx="8" cy="11.5" r=".6" fill="currentColor"/>
      </svg>
      <p>
        <strong>I'm here to help!</strong> Ask me about any parameter — evaporation temperature,
        refrigerant choice, defrost type — or request an explanation of how the pre-filled
        values were determined.
      </p>
    </div>

    <!-- CTA -->
    <button type="button" class="tgc-cta" @click="emit('ask')">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 3h12v8H9l-3 2v-2H2z"/>
      </svg>
      Ask Günther about this configuration
    </button>
  </div>
</template>

<style scoped>
.tgc {
  padding: 14px 14px 12px;
  background: white;
  border: 1px solid var(--c-border, #cfcdd6);
  border-left: 4px solid var(--c-brand-blue, #0078BE);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Header ── */
.tgc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-brand-blue, #0078BE);
}
.tgc-head-icon { flex-shrink: 0; }
.tgc-head-label {
  font-family: var(--font-ui, sans-serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

/* ── Title ── */
.tgc-title {
  margin: 0;
  font-family: var(--font-ui, sans-serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--c-brand-blue, #0078BE);
  line-height: 1.3;
}

/* ── Context line ── */
.tgc-context {
  margin: 0;
  font-family: var(--font-ui, sans-serif);
  font-size: 13px;
  color: var(--c-text-medium, #676377);
  line-height: 1.45;
}

/* ── Divider ── */
.tgc-divider {
  border: none;
  border-top: 1px solid var(--c-border-card, #e8e6ed);
  margin: 0;
}

/* ── Hints section ── */
.tgc-hints {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tgc-hints-head {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-ui, sans-serif);
  font-size: 11px;
  font-weight: 700;
  color: var(--c-text-value, #262326);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.tgc-hint-list {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-family: var(--font-ui, sans-serif);
  font-size: 12.5px;
  color: var(--c-text-medium, #676377);
  line-height: 1.45;
}
.tgc-hint-list strong { color: var(--c-text-value, #262326); }

/* ── Help note ── */
.tgc-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 6%, white);
  border: 1px solid color-mix(in srgb, var(--c-brand-blue, #0078BE) 15%, white);
  border-radius: 6px;
}
.tgc-note-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--c-brand-blue, #0078BE);
}
.tgc-note p {
  margin: 0;
  font-family: var(--font-ui, sans-serif);
  font-size: 12.5px;
  color: var(--c-text-value, #262326);
  line-height: 1.5;
}
.tgc-note strong { color: var(--c-brand-blue, #0078BE); }

/* ── CTA ── */
.tgc-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 9px 14px;
  background: var(--c-brand-blue, #0078BE);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-family: var(--font-ui, sans-serif);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;
}
.tgc-cta:hover {
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 82%, black);
}
.tgc-cta:active {
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 70%, black);
}
.tgc-cta:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
</style>
