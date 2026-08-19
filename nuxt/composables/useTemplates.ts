/**
 * useTemplates — CRUD-Composable für User-Konfigurations-Templates.
 *
 * Wrapt die drei /api/templates-Endpoints in eine reaktive Liste + einfache
 * Actions. Von TemplatesModal.vue, thermodynamics.vue (Auto-Apply) und
 * index.vue (Home-Karten) genutzt.
 *
 * Schema-Contract: siehe TemplatePayload in `nuxt/stores/configuration.ts`.
 */

import { ref, unref, watch } from 'vue'
import type { MaybeRef } from 'vue'
import type { TemplatePayload } from '~/stores/configuration'

export interface TemplateRecord {
  id: string
  name: string
  categorySlug: string
  isDefaultForCategory: boolean
  /** True wenn Row mit is_system=TRUE (Güntner-kuratierte Standard-Config). */
  isSystem: boolean
  /** True wenn Row dem aktuellen User gehört — nur dann darf User löschen/promoten. */
  isOwn: boolean
  configuration: TemplatePayload
  updatedAt: string
}

interface ListResponse {
  ok: boolean
  templates: TemplateRecord[]
  defaultId: string | null
  error?: string
}

interface SaveArgs {
  name: string
  categorySlug: string
  configuration: TemplatePayload
  makeDefault?: boolean
}

/**
 * Lädt Templates und exponiert CRUD-Actions. `categorySlug` = `null` lädt ALLE
 * Templates des Users (über alle Kategorien) — das ist der Regelfall im Modal,
 * damit ein DX-Template auch aus dem Air-Cooler-Kontext geladen werden kann.
 * Ein konkretes Slug filtert (z.B. für den Auto-Apply-Default in
 * thermodynamics.vue oder für den Home-Card-Prefetch).
 */
export function useTemplates(categorySlug: MaybeRef<string | null>) {
  const templates = ref<TemplateRecord[]>([])
  const defaultId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function reload() {
    const slug = unref(categorySlug)
    loading.value = true
    error.value = null
    try {
      const url = slug
        ? `/api/templates?category=${encodeURIComponent(slug)}`
        : '/api/templates'
      const res = await $fetch<ListResponse>(url)
      if (!res.ok) throw new Error(res.error || 'Failed to load')
      templates.value = res.templates
      defaultId.value = res.defaultId
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || String(err)
      templates.value = []
      defaultId.value = null
    } finally {
      loading.value = false
    }
  }

  async function save(args: SaveArgs): Promise<TemplateRecord | null> {
    error.value = null
    try {
      const res = await $fetch<{ ok: boolean; template: TemplateRecord; error?: string }>('/api/templates', {
        method: 'POST',
        body: args
      })
      if (!res.ok) throw new Error(res.error || 'Save failed')
      await reload()
      return res.template
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || String(err)
      return null
    }
  }

  async function remove(id: string): Promise<boolean> {
    error.value = null
    try {
      const res = await $fetch<{ ok: boolean; deleted: boolean; error?: string }>(`/api/templates/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error(res.error || 'Delete failed')
      await reload()
      return res.deleted
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || String(err)
      return false
    }
  }

  watch(() => unref(categorySlug), () => { reload() }, { immediate: true })

  return { templates, defaultId, loading, error, reload, save, remove }
}
