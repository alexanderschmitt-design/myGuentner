<script setup lang="ts">
/**
 * ApiKeyTester — button + status-pill that POSTs to a test endpoint and
 * reports whether the configured API key is valid. Used from /admin/rag-settings.
 *
 * Fehlermeldungen der Anbieter (Anthropic 400, Gemini 500, OpenRouter 402)
 * enthalten oft JSON-Blobs mit 200+ Zeichen. Der Pill wird deshalb hart
 * auf 260px max-width geklemmt, mit Ellipsis + Tooltip auf voller Text.
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  label: string
  endpoint: string
}>()

const status = ref<'idle' | 'testing' | 'ok' | 'failed'>('idle')
const message = ref<string | null>(null)

/** Kompakter Anzeige-Text für den Pill — schneidet lange Provider-Errors
 *  auf ein sinnvolles Fragment zurück. Vollständiger Fehler bleibt im
 *  title-Attribut (Tooltip beim Hover). */
const shortMessage = computed(() => {
  const m = message.value || ''
  if (!m) return ''
  const clean = m.replace(/\s+/g, ' ').trim()
  return clean.length > 80 ? clean.slice(0, 77) + '…' : clean
})

async function run() {
  status.value = 'testing'
  message.value = null
  try {
    const res = await $fetch<any>(props.endpoint, { method: 'POST' })
    if (res && res.ok !== false) {
      status.value = 'ok'
      message.value = res.model || res.message || 'OK'
    } else {
      status.value = 'failed'
      message.value = res?.error || 'Test failed'
    }
  } catch (err: any) {
    status.value = 'failed'
    message.value = err?.data?.error || err?.message || 'Test failed'
  }
}
</script>

<template>
  <div class="api-key-tester">
    <button type="button" class="btn btn-outline btn-sm" :disabled="status === 'testing'" @click="run">
      {{ status === 'testing' ? 'Testing…' : `Test ${label}` }}
    </button>
    <span
      v-if="status === 'ok'"
      class="status-pill status-ok"
      :title="message || ''"
    >✓ {{ shortMessage }}</span>
    <span
      v-else-if="status === 'failed'"
      class="status-pill status-failed"
      :title="message || 'Test failed'"
    >✗ {{ shortMessage }}</span>
  </div>
</template>

<style scoped>
.api-key-tester {
  /* inline-flex sprengte die Card-Breite wenn die Pill lang wurde.
     flex mit flex-wrap lässt die Pill in die nächste Zeile umbrechen
     falls sie zu breit für die aktuelle Zeile wird. */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  min-width: 0;
}
.api-key-tester button {
  flex-shrink: 0;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  /* Harte Grenze für lange Provider-Fehler — verhindert dass eine 500-
     Bytes-JSON-Error-Message die Card sprengt. Voller Text im title. */
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}
.status-ok {
  background: color-mix(in srgb, var(--c-success, #2E7D4F) 15%, white);
  color: var(--c-success, #2E7D4F);
}
.status-failed {
  background: color-mix(in srgb, var(--c-error, #B33A3A) 15%, white);
  color: var(--c-error, #B33A3A);
}
</style>
