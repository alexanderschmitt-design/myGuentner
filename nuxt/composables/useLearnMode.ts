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

/**
 * Category classifies what kind of information a note holds. Surfaced as a
 * radio group in the LearnBody editor.
 *   element  — info about this specific field / control
 *   relations — how this element interacts with other config values
 *   product  — product-specific facts (models, part numbers, options)
 */
export type LearnCategory = 'element' | 'relations' | 'product'

export const LEARN_CATEGORIES: ReadonlyArray<{ id: LearnCategory; label: string; hint: string }> = [
  { id: 'element',   label: 'Element',      hint: 'What does this field do?' },
  { id: 'relations', label: 'Relations',    hint: 'How it relates to other values' },
  { id: 'product',   label: 'Product',      hint: 'Product-specific notes' }
]

export interface LearnNote {
  id: string
  title: string
  body: string
  category: LearnCategory
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
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, LearnNote>
      // Legacy notes (pre-category) get 'element' as default
      for (const key of Object.keys(parsed)) {
        if (!parsed[key].category) parsed[key].category = 'element'
      }
      notes.value = parsed
    }
  } catch { /* ignore corrupt storage */ }
  hydrated = true
}

function persist() {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.value)) } catch { /* quota */ }
}

/**
 * Compute a stable id for the given element.
 *   Priority: closest [data-learn-id] ancestor → id attribute → CSS-path
 *
 * Walking up to the closest tagged ancestor is critical — when the user
 * clicks a raw <input>, the tag lives on its `.field` wrapper, and without
 * the walk-up we'd fall through to the fragile CSS-path fallback.
 */
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

/**
 * Resolved metadata for a picked element — surfaced by the Learn Mode
 * editor so users see a friendly field name + API-parameter name instead
 * of the raw ID string.
 */
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
    // Prefer the first <label> INSIDE the anchor (typical .field pattern:
    // <div class="field"><label>…</label><input/></div>)
    const label = anchor.querySelector('label')
    fieldName = label?.textContent?.trim() || ''
  }
  if (!fieldName) {
    // Last-resort fallback so untagged clicks still show something readable
    fieldName = anchor.tagName.toLowerCase()
  }
  return {
    fieldName,
    apiParam,
    learnId: elementLearnId(anchor)
  }
}

export function useLearnMode() {
  if (typeof window !== 'undefined' && !hydrated) readFromStorage()

  function saveNote(id: string, patch: { title: string; body: string; category: LearnCategory }) {
    notes.value = {
      ...notes.value,
      [id]: {
        id,
        title: patch.title,
        body: patch.body,
        category: patch.category,
        updatedAt: new Date().toISOString()
      }
    }
    persist()
  }

  function deleteNote(id: string) {
    const { [id]: _, ...rest } = notes.value
    notes.value = rest
    persist()
  }

  function pick(el: HTMLElement) {
    // Re-target to the closest tagged ancestor so annotations always live
    // on the field wrapper, not on the raw input the user happened to click.
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
    clearPick
  }
}
