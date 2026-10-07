<script setup lang="ts">
/**
 * /produkte/:variantKey — User-facing Produkt-Varianten-Detailseite.
 * Zeigt Beschreibung, Dokumente und verfügbare Templates für eine Variante (z.B. GAMC_PX).
 */

interface DocLink {
  id: string
  name: string
  type: string
  dmsId: string | null
  source: string
}

interface VariantData {
  seriesVariant: string
  description: string
  docs: DocLink[]
  templates: { id: string; name: string }[]
}

const route = useRoute()
const variantKey = computed(() => String(route.params.variantKey))
const displayName = computed(() => variantKey.value.replace(/_/g, ' '))

const loading = ref(true)
const variant = ref<VariantData | null>(null)
const notFound = ref(false)

useHead(() => ({
  title: variant.value
    ? `myGüntner — ${variant.value.seriesVariant}`
    : `myGüntner — ${displayName.value}`
}))

onMounted(async () => {
  try {
    const res = await $fetch<{ ok: boolean; data: VariantData | null }>(
      `/api/products/variants/${variantKey.value}`
    )
    if (res.ok && res.data) {
      variant.value = res.data
    } else {
      notFound.value = true
    }
  } catch {
    notFound.value = true
  }
  loading.value = false
})

function docHref(doc: DocLink): string {
  return doc.dmsId ? `/api/dms/content/${doc.dmsId}` : `/api/documents/${doc.id}/download`
}
</script>

<template>
  <div class="variant-page">
    <!-- Breadcrumbs -->
    <nav class="crumbs" aria-label="Breadcrumb">
      <NuxtLink to="/" class="crumb">Home</NuxtLink>
      <span class="crumb-sep">/</span>
      <NuxtLink to="/mygpc" class="crumb">Produkte</NuxtLink>
      <span class="crumb-sep">/</span>
      <span class="crumb crumb--current">{{ variant ? variant.seriesVariant : displayName }}</span>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="state-msg">Lade…</div>

    <!-- Not found -->
    <div v-else-if="notFound" class="state-msg state-msg--warn">
      Diese Produktvariante ist noch nicht dokumentiert.
      <NuxtLink to="/mygpc" class="back-link">Zurück zum Konfigurator</NuxtLink>
    </div>

    <!-- Content -->
    <template v-else-if="variant">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-tag">Produktvariante</div>
        <h1 class="hero-title">{{ variant.seriesVariant }}</h1>
        <p v-if="variant.description" class="hero-desc">{{ variant.description }}</p>
        <div class="hero-actions">
          <NuxtLink to="/mygpc" class="cta cta--primary">
            Jetzt konfigurieren
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 10h12M11 5l5 5-5 5"/>
            </svg>
          </NuxtLink>
          <NuxtLink to="/mygpc" class="cta cta--ghost">Zur Produktauswahl</NuxtLink>
        </div>
      </section>

      <!-- Templates -->
      <section v-if="variant.templates.length" class="section">
        <h2 class="section-title">Empfohlene Konfigurationen</h2>
        <p class="section-hint">Diese Konfigurationen wurden speziell für {{ variant.seriesVariant }} vorausgewählt.</p>
        <div class="tpl-grid">
          <article v-for="tpl in variant.templates" :key="tpl.id" class="tpl-card">
            <div class="tpl-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
              </svg>
            </div>
            <p class="tpl-name">{{ tpl.name }}</p>
            <NuxtLink to="/mygpc" class="tpl-link">Konfiguration starten →</NuxtLink>
          </article>
        </div>
      </section>

      <!-- Documents -->
      <section v-if="variant.docs.length" class="section section--alt">
        <h2 class="section-title">Dokumente</h2>
        <div class="docs-grid">
          <a
            v-for="doc in variant.docs"
            :key="doc.id"
            :href="docHref(doc)"
            target="_blank"
            rel="noopener"
            class="doc-card"
          >
            <div class="doc-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="10" y1="13" x2="10" y2="17"/>
                <line x1="14" y1="13" x2="14" y2="17"/>
              </svg>
            </div>
            <div class="doc-info">
              <p class="doc-name">{{ doc.name }}</p>
              <p class="doc-meta">{{ doc.type }} · {{ doc.source === 'dms' ? 'DMS' : 'Upload' }}</p>
            </div>
            <div class="doc-dl" aria-hidden="true">
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 3v10M6 9l4 4 4-4M4 16h12"/>
              </svg>
            </div>
          </a>
        </div>
      </section>

      <!-- Empty state if nothing documented -->
      <section v-if="!variant.templates.length && !variant.docs.length" class="section">
        <p class="state-msg">Für diese Variante sind noch keine Dokumente oder Konfigurationen hinterlegt.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.variant-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: var(--space-xl);
}

/* Breadcrumbs */
.crumbs { display: flex; gap: 8px; align-items: center; font-size: var(--font-2xs); }
.crumb  { color: var(--c-text-medium); text-decoration: none; }
.crumb:hover:not(.crumb--current) { color: var(--c-brand-blue); }
.crumb--current { color: var(--c-text); font-weight: 500; }
.crumb-sep { color: var(--c-text-light); }

/* Hero */
.hero {
  padding: var(--space-lg) var(--space-md);
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.hero-tag {
  font-size: var(--font-3xs);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--c-brand-blue);
  font-weight: 500;
}
.hero-title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: var(--font-5xl, 3rem);
  font-weight: 400;
  color: var(--c-text);
  line-height: 100%;
}
.hero-desc {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--c-text-medium);
  line-height: 1.6;
  max-width: 720px;
}
.hero-actions {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  padding-top: var(--space-xs);
}

/* CTAs */
.cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 42px;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: filter 0.12s, background 0.12s;
}
.cta--primary { background: var(--c-brand-blue); color: var(--c-text-inverted); border: none; }
.cta--primary:hover { filter: brightness(1.07); }
.cta--ghost { background: transparent; color: var(--c-text-medium); border: 1px solid var(--c-border); }
.cta--ghost:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }

/* Section */
.section {
  padding: var(--space-md);
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.section--alt { background: var(--c-surface-alt); }
.section-title {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  font-size: var(--font-3xl);
  color: var(--c-text);
  line-height: 100%;
}
.section-hint { margin: 0; color: var(--c-text-medium); font-size: var(--font-2xs); }

/* Templates grid */
.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-xs);
}
.tpl-card {
  padding: var(--space-sm);
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.tpl-card:hover {
  border-color: var(--c-brand-blue);
  box-shadow: 0 2px 8px rgba(38, 102, 224, 0.08);
}
.tpl-icon {
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
}
.tpl-name {
  margin: 0;
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-text);
  line-height: 1.4;
}
.tpl-link {
  margin-top: auto;
  font-size: var(--font-3xs);
  color: var(--c-brand-blue);
  text-decoration: none;
}
.tpl-link:hover { text-decoration: underline; }

/* Documents grid */
.docs-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.doc-card {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 12px var(--space-sm);
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  text-decoration: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.doc-card:hover {
  border-color: var(--c-brand-blue);
  box-shadow: 0 2px 8px rgba(38, 102, 224, 0.06);
}
.doc-icon {
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}
.doc-info { flex: 1; min-width: 0; }
.doc-name { margin: 0; font-size: var(--font-2xs); font-weight: 500; color: var(--c-text); }
.doc-meta { margin: 2px 0 0; font-size: var(--font-3xs); color: var(--c-text-medium); }
.doc-dl {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}

/* State messages */
.state-msg {
  padding: var(--space-lg);
  text-align: center;
  color: var(--c-text-medium);
  font-size: var(--font-2xs);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}
.state-msg--warn { color: var(--c-text-medium); }
.back-link { color: var(--c-brand-blue); text-decoration: none; font-size: var(--font-2xs); }
.back-link:hover { text-decoration: underline; }
</style>
