/**
 * useToast — reactive toast queue.
 *
 * Toasts persist as a shared ref across the app. Any component can
 * `useToast().success('Saved')` and the <ToastStack /> mounted in
 * default layout will render + auto-dismiss it.
 */

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  /** Aktionsorientierter Hinweis, wie der Nutzer den Fehler beheben kann. */
  hint?: string
  eventId?: string
  date?: string
  /** Human-readable label of the field that caused the error (e.g. "Capacity"). */
  fieldLabel?: string
  /** Current (invalid) value of that field, formatted for display (e.g. "-25 kW"). */
  currentValue?: string
  createdAt: number
}

// Module-level state — one queue per browser tab. Nuxt SSR treats useState
// for cross-request isolation; here it's inherently client-only (toasts
// don't render on the server anyway).
const toasts = ref<Toast[]>([])
let nextId = 1

function push(kind: ToastKind, message: string, timeoutMs = 4000, extras?: Partial<Pick<Toast, 'eventId' | 'date' | 'fieldLabel' | 'currentValue' | 'hint'>>) {
  const t: Toast = { id: nextId++, kind, message, createdAt: Date.now(), ...extras }
  toasts.value = [...toasts.value, t]
  if (timeoutMs > 0) {
    setTimeout(() => dismiss(t.id), timeoutMs)
  }
  return t.id
}

function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useToast() {
  return {
    toasts: toasts as Readonly<typeof toasts>,
    success: (message: string, timeoutMs?: number) => push('success', message, timeoutMs),
    // Errors default to sticky (0 = no auto-dismiss). Aufrufer, die kurze
    // Info-Fehler wollen, können explizit ein Timeout setzen.
    error:   (message: string, timeoutMs?: number) => push('error', message, timeoutMs ?? 0),
    warning: (message: string, timeoutMs?: number) => push('warning', message, timeoutMs ?? 0),
    info:    (message: string, timeoutMs?: number) => push('info', message, timeoutMs),
    // Strukturierter Push für API-Validierungsfehler (Referenz-Optik:
    // Zeile 1 = Message, dann Field + Current Value, dann EventId + Date).
    // Bleibt sticky.
    apiError: (payload: { message: string; hint?: string; eventId?: string; date?: string; fieldLabel?: string; currentValue?: string }) => {
      // Alte Warning/Error-Toasts abräumen — sonst stapeln sich Duplikate,
      // wenn der User mehrfach auf NEXT klickt und die API immer wieder
      // dieselbe Meldung liefert.
      toasts.value = toasts.value.filter(t => t.kind !== 'warning' && t.kind !== 'error')
      return push('warning', payload.message, 0, {
        hint: payload.hint,
        eventId: payload.eventId,
        date: payload.date,
        fieldLabel: payload.fieldLabel,
        currentValue: payload.currentValue
      })
    },
    dismiss
  }
}
