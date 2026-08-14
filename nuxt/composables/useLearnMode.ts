/**
 * useLearnMode — annotation store + active-picker state.
 *
 * When the `learn_mode` feature flag is on, admins can pick any element
 * on the page and attach a note. Notes are keyed by a stable identity:
 *   • `data-learn-id="my-field"` on the element (preferred, refactor-safe)
 *   • otherwise a CSS path from the nearest landmark ancestor (best-effort)
 *
 * Persistenz: Supabase `learn_notes`-Tabelle via /api/learn/notes.
 * localStorage bleibt nur als Offline-Fallback für den aktuellen Tab —
 * beim nächsten erfolgreichen fetch wird der Server als Wahrheit übernommen.
 */
import { ref, computed } from 'vue'

const STORAGE_KEY = 'mygpc_learn_notes'

export type LearnCategory = 'element' | 'relations' | 'product'
export type LearnStatus = 'draft' | 'approved' | 'rejected'

export const LEARN_CATEGORIES: ReadonlyArray<{ id: LearnCategory; label: string; hint: string }> = [
  { id: 'element',   label: 'Element',      hint: 'What does this field do?' },
  { id: 'relations', label: 'Relations',    hint: 'How it relates to other values' },
  { id: 'product',   label: 'Product',      hint: 'Product-specific notes' }
]

export interface LearnNote {
  id: string                  // Client-Key: elementLearnId(el) — nicht die DB-UUID
  serverId?: string           // Supabase UUID (fehlt bei rein lokalen, noch nicht synchronisierten Notes)
  title: string
  body: string
  category: LearnCategory
  status?: LearnStatus
  ownedByMe?: boolean
  updatedAt: string
}

const notes = ref<Record<string, LearnNote>>({})
const activeElement = ref<HTMLElement | null>(null)
const activeId = ref<string | null>(null)
let hydratedLocal = false
let hydratedServer = false
let hydratePromise: Promise<void> | null = null

function readFromStorage() {
  if (typeof window === 'undefined' || hydratedLocal) return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, LearnNote>
      for (const key of Object.keys(parsed)) {
        if (!parsed[key].category) parsed[key].category = 'element'
      }
      notes.value = parsed
    }
  } catch { /* ignore corrupt storage */ }
  hydratedLocal = true
}

function persistLocal() {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.value)) } catch { /* quota */ }
}

async function hydrateFromServer() {
  if (typeof window === 'undefined') return
  if (hydratedServer) return
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    try {
      const pageUrl = window.location.pathname
      const res = await fetch(`/api/learn/notes?pageUrl=${encodeURIComponent(pageUrl)}`, {
        credentials: 'same-origin'
      })
      if (!res.ok) return // 401/403 → wir bleiben bei localStorage
      const payload = await res.json() as { ok: boolean; notes: any[] }
      if (!payload.ok) return

      const map: Record<string, LearnNote> = {}
      for (const row of payload.notes || []) {
        const key = row.data_learn_id || row.css_path
        if (!key) continue
        map[key] = {
          id: key,
          serverId: row.id,
          title: row.title || '',
          body: row.description || '',
          category: (row.category || 'element') as LearnCategory,
          status: row.status as LearnStatus,
          ownedByMe: false,   // wird nachgeführt, wenn wir den eigenen User erkennen
          updatedAt: row.updated_at
        }
      }
      notes.value = { ...notes.value, ...map }
      persistLocal()
      hydratedServer = true
    } catch { /* offline → localStorage bleibt maßgeblich */ }
  })()
  await hydratePromise
}

export function elementLearnId(el: HTMLElement): string {
  const anchor = el.closest<HTMLElement>('[data-learn-id]')
  if (anchor) return `data:${anchor.dataset.learnId}`
  if (el.id) return `elid:${el.id}`

  const path: string[] = []
  let cur: HTMLElement | null = el
  const landmarks = new Set(['MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER'])
  while (cur && cur !== document.body) {
    let seg = cur.tagName.toLowerCase()
    const cls = Array.from(cur.classList).filter((c) => !c.startsWith('router-link')).slice(0, 2).join('.')
    if (cls) seg += '.' + cls
    const parent = cur.parentElement
    if (parent) {
      const same = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName)
      if (same.length > 1) {
        const i = same.indexOf(cur) + 1
        seg += `:nth-of-type(${i})`
      }
    }
    path.unshift(seg)
    if (landmarks.has(cur.tagName)) break
    cur = cur.parentElement
  }
  return `path:${window.location.pathname}${path.join('>')}`
}

export interface LearnElementMeta {
  fieldName: string
  apiParam: string | null
  learnId: string
}

export function resolveElementMeta(el: HTMLElement): LearnElementMeta {
  const anchor = el.closest<HTMLElement>('[data-learn-id]') || el
  const apiParam = anchor.dataset.apiParam || null
  let fieldName = anchor.dataset.fieldName || ''
  if (!fieldName) {
    const label = anchor.querySelector('label')
    fieldName = label?.textContent?.trim() || ''
  }
  if (!fieldName) {
    fieldName = anchor.tagName.toLowerCase()
  }
  return {
    fieldName,
    apiParam,
    learnId: elementLearnId(anchor)
  }
}

function extractDataLearnId(key: string): string | null {
  return key.startsWith('data:') ? key.slice(5) : null
}
function extractCssPath(key: string): string | null {
  return key.startsWith('data:') ? null : key
}

export function useLearnMode() {
  if (typeof window !== 'undefined' && !hydratedLocal) readFromStorage()
  if (typeof window !== 'undefined' && !hydratedServer) void hydrateFromServer()

  async function saveNote(id: string, patch: { title: string; body: string; category: LearnCategory }) {
    const now = new Date().toISOString()
    const existing = notes.value[id]
    const optimistic: LearnNote = {
      id,
      serverId: existing?.serverId,
      title: patch.title,
      body: patch.body,
      category: patch.category,
      status: existing?.status,
      ownedByMe: existing?.ownedByMe ?? true,
      updatedAt: now
    }
    notes.value = { ...notes.value, [id]: optimistic }
    persistLocal()

    // Server-Sync — best effort. Fehler blockieren nicht die UI.
    try {
      const pageUrl = window.location.pathname
      if (existing?.serverId) {
        const res = await fetch(`/api/learn/notes/${existing.serverId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            title: patch.title,
            description: patch.body,
            category: patch.category
          })
        })
        if (res.ok) {
          const payload = await res.json() as { ok: boolean; note: any }
          if (payload.ok && payload.note) {
            notes.value = {
              ...notes.value,
              [id]: {
                ...optimistic,
                serverId: payload.note.id,
                status: payload.note.status,
                updatedAt: payload.note.updated_at
              }
            }
            persistLocal()
          }
        }
      } else {
        const res = await fetch('/api/learn/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            pageUrl,
            dataLearnId: extractDataLearnId(id),
            cssPath: extractCssPath(id),
            title: patch.title,
            description: patch.body,
            category: patch.category
          })
        })
        if (res.ok) {
          const payload = await res.json() as { ok: boolean; note: any }
          if (payload.ok && payload.note) {
            notes.value = {
              ...notes.value,
              [id]: {
                ...optimistic,
                serverId: payload.note.id,
                status: payload.note.status,
                ownedByMe: true,
                updatedAt: payload.note.updated_at
              }
            }
            persistLocal()
          }
        }
      }
    } catch { /* offline OK */ }
  }

  async function deleteNote(id: string) {
    const existing = notes.value[id]
    const { [id]: _, ...rest } = notes.value
    notes.value = rest
    persistLocal()

    if (existing?.serverId) {
      try {
        await fetch(`/api/learn/notes/${existing.serverId}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        })
      } catch { /* ignore */ }
    }
  }

  function pick(el: HTMLElement) {
    const target = el.closest<HTMLElement>('[data-learn-id]') || el
    activeElement.value = target
    activeId.value = elementLearnId(target)
  }

  function clearPick() {
    activeElement.value = null
    activeId.value = null
  }

  const activeNote = computed<LearnNote | null>(() => {
    if (!activeId.value) return null
    return notes.value[activeId.value] || null
  })

  return {
    notes,
    activeElement,
    activeId,
    activeNote,
    hasNoteFor: (id: string) => !!notes.value[id],
    getNote: (id: string) => notes.value[id] || null,
    saveNote,
    deleteNote,
    pick,
    clearPick,
    refresh: hydrateFromServer
  }
}
