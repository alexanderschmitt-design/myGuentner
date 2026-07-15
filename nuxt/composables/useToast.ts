/**
 * useToast — reactive toast queue.
 *
 * Toasts persist as a shared ref across the app. Any component can
 * `useToast().success('Saved')` and the <ToastStack /> mounted in
 * default layout will render + auto-dismiss it.
 */

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  createdAt: number
}

// Module-level state — one queue per browser tab. Nuxt SSR treats useState
// for cross-request isolation; here it's inherently client-only (toasts
// don't render on the server anyway).
const toasts = ref<Toast[]>([])
let nextId = 1

function push(kind: ToastKind, message: string, timeoutMs = 4000) {
  const t: Toast = { id: nextId++, kind, message, createdAt: Date.now() }
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
    error: (message: string, timeoutMs?: number) => push('error', message, timeoutMs ?? 6000),
    info: (message: string, timeoutMs?: number) => push('info', message, timeoutMs),
    dismiss
  }
}
