<script setup lang="ts">
/**
 * /admin — Hub landing page. Card grid linking to every admin sub-section.
 */

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Admin' })

interface Card {
  to: string
  title: string
  description: string
  icon: string  // SVG path (16-viewBox)
}

const cards: Card[] = [
  {
    to: '/admin/documents',
    title: 'Documents',
    description: 'PDFs und Handbücher hochladen, indexieren und aus dem DMS importieren.',
    icon: 'M4 2h6l4 4v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M10 2v4h4'
  },
  {
    to: '/admin/rag-settings',
    title: 'RAG Settings',
    description: 'LLM-Provider, Embedding-Modell, Chunk-Größe, Top-K, System-Prompt.',
    icon: 'M8 2v2 M8 12v2 M2 8h2 M12 8h2 M4 4l1.5 1.5 M10.5 10.5 12 12 M4 12l1.5-1.5 M10.5 5.5 12 4 M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z'
  },
  {
    to: '/admin/rag-test',
    title: 'RAG Test',
    description: 'Query gegen den Vector Store — Chat oder reines Retrieval.',
    icon: 'M2 3h12v10H2z M4 7h8 M4 10h5'
  },
  {
    to: '/admin/dms',
    title: 'DMS',
    description: 'Volltextsuche im d.velop DMS, Dokumenten-Detail, Import-Jobs.',
    icon: 'M2 4h5l1.5 1.5H14v8H2z'
  },
  {
    to: '/admin/system',
    title: 'System',
    description: 'Status aller Backends: Vector Store, DMS, LLM, GPC.EU.',
    icon: 'M2 4h12v3H2z M2 9h12v3H2z M5 5.5v.01 M5 10.5v.01'
  },
  {
    to: '/admin/users',
    title: 'Users',
    description: 'Supabase-Nutzer verwalten (Liste + Anlegen).',
    icon: 'M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M3 14v-.5A3.5 3.5 0 0 1 6.5 10h3A3.5 3.5 0 0 1 13 13.5v.5'
  },
  {
    to: '/admin/features',
    title: 'Features',
    description: 'Chatbot ein/aus, Learn-Mode (Element-Kommentierung) und andere App-Schalter.',
    icon: 'M8 2v2 M8 12v2 M2 8h2 M12 8h2 M4 4l1.5 1.5 M10.5 10.5 12 12 M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z'
  },
  {
    to: '/admin/home-sections',
    title: 'Home Sections',
    description: 'Sichtbarkeit der Startseiten-Tabs pro Browser umschalten.',
    icon: 'M2 3h12v3H2z M2 8h12v3H2z M2 13h8v1H2z'
  }
]
</script>

<template>
  <div>
    <AdminPageHeader
      title="Admin"
      description="Content, Konfiguration und System-Health an einem Ort."
    />

    <div class="hub-grid">
      <NuxtLink v-for="c in cards" :key="c.to" :to="c.to" class="hub-card">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor"
               stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path :d="c.icon"/>
          </svg>
        </span>
        <div>
          <strong>{{ c.title }}</strong>
          <p>{{ c.description }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.hub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}
.hub-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--c-text-value);
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.hub-card:hover {
  border-color: var(--c-brand-blue);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}
.hub-card-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-xs);
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  color: var(--c-brand-blue);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hub-card strong {
  display: block;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
  margin-bottom: 4px;
}
.hub-card p {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 1.45;
}
</style>
