<script setup lang="ts">
export interface ProductPreviewData {
  productName: string
  category: string
  subcategory?: string | null
  series?: string | null
  description?: string | null
  imagePath: string
}

defineProps<{
  data: ProductPreviewData
  /** Set to false when the card is embedded in ChatProductMessageGroup
   *  (buttons live in the group, not in the card). Default true. */
  showActions?: boolean
}>()

const emit = defineEmits<{
  (e: 'action', action: 'more-info' | 'configure' | 'contact-sales'): void
}>()
</script>

<template>
  <div class="ppc">
    <!-- Günther badge -->
    <div class="ppc-badge">
      <svg viewBox="0 0 56 56" width="14" height="14" fill="none" aria-hidden="true">
        <rect x="10" y="14" width="36" height="30" rx="8" fill="var(--c-brand-blue,#2666e0)"/>
        <circle cx="22" cy="28" r="2.2" fill="white"/>
        <circle cx="34" cy="28" r="2.2" fill="white"/>
        <path d="M23 33.5 Q28 36 33 33.5" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      </svg>
      <span>Produktvorschau von Günther</span>
    </div>

    <!-- Image -->
    <div class="ppc-img-wrap">
      <img
        :src="data.imagePath"
        :alt="data.productName"
        class="ppc-img"
        loading="lazy"
      />
    </div>

    <!-- Meta -->
    <div class="ppc-meta">
      <span class="ppc-cat">{{ data.category }}</span>
      <span v-if="data.subcategory" class="ppc-sub">{{ data.subcategory }}</span>
    </div>

    <!-- Title -->
    <h3 class="ppc-title">{{ data.productName }}</h3>

    <!-- Description -->
    <p v-if="data.description" class="ppc-desc">{{ data.description }}</p>
    <p v-else class="ppc-desc ppc-desc--placeholder">
      Hochwertiges Güntner-Produkt aus dem Programm von Güntner.
    </p>

    <!-- Actions -->
    <div v-if="showActions !== false" class="ppc-actions">
      <button type="button" class="ppc-btn ppc-btn--info" @click="emit('action', 'more-info')">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M8 7.5v4M8 5.5h.01"/>
        </svg>
        Weitere Infos
      </button>
      <button type="button" class="ppc-btn ppc-btn--configure" @click="emit('action', 'configure')">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="2.5"/>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M11.4 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4"/>
        </svg>
        So ein Produkt konfigurieren
      </button>
      <button type="button" class="ppc-btn ppc-btn--sales" @click="emit('action', 'contact-sales')">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2 3h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3z"/><path d="M2 3l6 5 6-5"/>
        </svg>
        Sales-Mitarbeiter kontaktieren
      </button>
    </div>
  </div>
</template>

<style scoped>
.ppc {
  background: var(--c-surface, #fff);
  border: 1px solid var(--c-border, #d8d8d8);
  border-left: 3px solid var(--c-brand-blue, #2666e0);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 100%;
}

/* Günther badge */
.ppc-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 6px;
  background: color-mix(in srgb, var(--c-brand-blue, #2666e0) 6%, white);
  border-bottom: 1px solid color-mix(in srgb, var(--c-brand-blue, #2666e0) 14%, transparent);
  font-family: var(--font-ui, sans-serif);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-brand-blue, #2666e0);
}

/* Image */
.ppc-img-wrap {
  width: 100%;
  height: 148px;
  background: var(--c-bg, #fafafa);
  border-bottom: 1px solid var(--c-border, #d8d8d8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ppc-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
  box-sizing: border-box;
}

/* Body */
.ppc-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px 2px;
}
.ppc-cat {
  font-family: var(--font-ui, sans-serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-brand-blue, #2666e0);
  background: color-mix(in srgb, var(--c-brand-blue, #2666e0) 8%, transparent);
  border-radius: 3px;
  padding: 2px 6px;
}
.ppc-sub {
  font-family: var(--font-ui, sans-serif);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c-text-medium, #636362);
  background: var(--c-bg, #fafafa);
  border: 1px solid var(--c-border, #d8d8d8);
  border-radius: 3px;
  padding: 2px 6px;
}

.ppc-title {
  margin: 0;
  padding: 4px 12px 6px;
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-xs, 15.69px);
  font-weight: 700;
  color: var(--c-text-value, #262326);
  line-height: 1.3;
}

.ppc-desc {
  margin: 0;
  padding: 0 12px 10px;
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium, #636362);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ppc-desc--placeholder {
  font-style: italic;
  color: var(--c-text-light, #9896a0);
}

/* Actions */
.ppc-actions {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--c-border, #d8d8d8);
}
.ppc-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid var(--c-border, #d8d8d8);
  background: transparent;
  font-family: var(--font-ui, sans-serif);
  font-size: var(--font-3xs, 12.81px);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.ppc-btn:last-child { border-bottom: none; }

.ppc-btn--info {
  color: var(--c-text-value, #262326);
}
.ppc-btn--info:hover {
  background: var(--c-bg, #fafafa);
}

.ppc-btn--configure {
  color: var(--c-brand-blue, #2666e0);
  background: color-mix(in srgb, var(--c-brand-blue, #2666e0) 4%, transparent);
}
.ppc-btn--configure:hover {
  background: color-mix(in srgb, var(--c-brand-blue, #2666e0) 10%, transparent);
}

.ppc-btn--sales {
  color: white;
  background: var(--c-brand-blue, #2666e0);
}
.ppc-btn--sales:hover {
  background: color-mix(in srgb, var(--c-brand-blue, #2666e0) 88%, black);
}
</style>
