<script setup lang="ts">
/**
 * ProductCategoryCard — 1:1 with Figma productCategory tile (node 1788:57857).
 *
 * Structure:
 *   [ image 240px full-width ]
 *   [ 14px content pad
 *     [ icon 30px + title (Simplon BP 23.7px) ]
 *     [ primary CTA (button) ]
 *     [ optional secondary buttons ]
 *     [ optional "last configuration" link with 12px ticket icon ]
 *   ]
 */

interface Extra { label: string; onClick: () => void }

defineProps<{
  image: string
  icon?: string | null
  title: string
  ctaLabel: string
  onCta: () => void
  extras?: Extra[]
  lastConfig?: string | null
}>()
</script>

<template>
  <article class="product-tile">
    <div class="tile-image">
      <img :src="image" :alt="title" loading="lazy" />
    </div>
    <div class="tile-content">
      <div class="tile-header">
        <div v-if="icon" class="tile-icon">
          <img :src="icon" :alt="`${title} icon`" />
        </div>
        <h3 class="tile-title">{{ title }}</h3>
      </div>

      <button class="tile-cta" @click="onCta">{{ ctaLabel }}</button>

      <button
        v-for="e in extras"
        :key="e.label"
        class="tile-cta"
        @click="e.onClick"
      >{{ e.label }}</button>

      <div v-if="lastConfig" class="last-config">
        <span class="last-config-label">last configuration</span>
        <a href="#" class="last-config-link" @click.prevent>
          <svg class="last-config-icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <line x1="1.5" y1="4.5" x2="10.5" y2="4.5" stroke="currentColor" stroke-width="1.2"/>
            <line x1="4.5" y1="4.5" x2="4.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ lastConfig }}
        </a>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-tile {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);           /* 4px */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s, box-shadow 0.15s;
}
.product-tile:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.tile-image {
  height: 240px;
  min-height: 240px;
  max-height: 240px;
  width: 100%;
  overflow: hidden;
  background: var(--c-surface-alt);
}
.tile-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile-content {
  border-top: 1px solid var(--c-border);
  padding: var(--space-xs);                  /* 14px */
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);                      /* 14px */
}

.tile-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs2);                     /* 9px */
}
.tile-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tile-icon img { width: 100%; height: 100%; object-fit: contain; }

.tile-title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: var(--font-xl);                 /* 23.7px */
  line-height: 1;
  font-weight: 400;
  color: var(--c-brand-dark-grey);           /* #3c3c3b */
}

/* CTA button (secondary variant per Figma Code Connect) */
.tile-cta {
  width: 100%;
  padding: var(--space-xs2) var(--space-xs);
  background: var(--c-brand-blue);
  color: white;
  border: none;
  border-radius: var(--radius-md);           /* 8px */
  font-family: var(--font-ui);
  font-size: var(--font-2xs);                /* 14.17px */
  line-height: var(--lh-2xs);
  font-weight: 500;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition: filter 0.15s;
}
.tile-cta:hover { filter: brightness(1.08); }
.tile-cta:focus-visible { outline: none; box-shadow: var(--shadow-focus); }

.last-config {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.last-config-label {
  font-family: var(--font-ui);
  font-size: var(--font-4xs);                /* 11.58px */
  line-height: var(--lh-4xs);                /* 14px */
  color: var(--c-text-light);                /* #888887 */
  letter-spacing: 0.1px;
}
.last-config-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);                     /* 5px */
  padding: var(--space-xs4);                 /* 3px */
  border-radius: var(--radius-xs2);          /* 2px */
  color: var(--c-text-medium);               /* #636362 */
  font-family: var(--font-ui);
  font-size: var(--font-3xs);                /* 12.81px */
  line-height: var(--lh-3xs);                /* 15px */
  letter-spacing: 0.1px;
  text-decoration: none;
  transition: background 0.15s;
}
.last-config-link:hover { background: var(--c-surface-alt); }
.last-config-icon { flex-shrink: 0; color: currentColor; }
</style>
