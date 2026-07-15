/**
 * useLearnMode — annotation store + active-picker state.
 *
 * When the `learn_mode` feature flag is on, admins can pick any element
 * on the page and attach a note. Notes are keyed by a stable identity:
 *   • `data-learn-id="my-field"` on the element (preferred, refactor-safe)
 *   • otherwise a CSS path from the nearest landmark ancestor (best-effort)
 *
 * All storage is localStorage-only for now; a Supabase backend can plug in
 * later without changing the consumer API. Notes are per-browser.
 */
import { ref, computed } from 'vue'

const STORAGE_KEY = 'mygpc_learn_notes'

export interface LearnNote {
  id: string
  title: string
  body: string
  updatedAt: string
}

// Module-scoped state — one store per browser tab
const notes = ref<Record<string, LearnNote>>({})
const activeElement = ref<HTMLElement | null>(null)
const activeId = ref<string | null>(null)
let hydrated = false

function readFromStorage() {
  if (typeof window === 'undefined' || hydrated) return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) notes.value = JSON.parse(raw)
  } catch { /* ignore corrupt storage */ }
  hydrated = true
}

function persist() {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.value)) } catch { /* quota */ }
}

/**
 * Compute a stable id for the given element.
 *   Priority: data-learn-id → id attribute → CSS-path from nearest landmark.
 */
export function elementLearnId(el: HTMLElement): string {
  const dataId = el.dataset?.learnId
  if (dataId) return `data:${dataId}`
  if (el.id) return `elid:${el.id}`

  const path: string[] = []
  let cur: HTMLElement | null = el
  const landmarks = new Set(['MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER'])
  while (cur && cur !== document.body) {
    let seg = cur.tagName.toLowerCase()
    const cls = Array.from(cur.classList).filter((c) => !c.startsWith('router-link')).slice(0, 2).join('.')
    if (cls) seg += '.' + cls
    // Include nth-of-type to disambiguate siblings
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

export function useLearnMode() {
  if (typeof window !== 'undefined' && !hydrated) readFromStorage()

  function saveNote(id: string, patch: { title: string; body: string }) {
    notes.value = {
      ...notes.value,
      [id]: { id, title: patch.title, body: patch.body, updatedAt: new Date().toISOString() }
    }
    persist()
  }

  function deleteNote(id: string) {
    const { [id]: _, ...rest } = notes.value
    notes.value = rest
    persist()
  }

  function pick(el: HTMLElement) {
    activeElement.value = el
    activeId.value = elementLearnId(el)
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
    clearPick
  }
}
