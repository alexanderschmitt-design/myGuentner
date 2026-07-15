<script setup lang="ts">
/**
 * ApiKeyTester — button + status-pill that POSTs to a test endpoint and
 * reports whether the configured API key is valid. Used from /admin/rag-settings.
 */
import { ref } from 'vue'

const props = defineProps<{
  label: string
  endpoint: string
}>()

const status = ref<'idle' | 'testing' | 'ok' | 'failed'>('idle')
const message = ref<string | null>(null)

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
    <span v-if="status === 'ok'" class="status-pill status-ok">✓ {{ message }}</span>
    <span v-else-if="status === 'failed'" class="status-pill status-failed">✗ {{ message }}</span>
  </div>
</template>

<style scoped>
.api-key-tester {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
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
