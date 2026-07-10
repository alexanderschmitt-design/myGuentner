<script setup lang="ts">
import type { StepId } from '~/composables/useFlows';

const props = defineProps<{
  step: StepId;
  nextDisabled?: boolean;
  nextLabel?: string;
}>();

const emit = defineEmits<{ (e: 'next'): void; (e: 'reset'): void }>();

const { prevRoute, nextRoute } = useFlows();
const router = useRouter();

const prev = computed(() => prevRoute(props.step));
const next = computed(() => nextRoute(props.step));

function goNext() {
  emit('next');
  if (next.value) router.push(next.value);
}
function goBack() { if (prev.value) router.push(prev.value); }
</script>

<template>
  <div class="action-bar">
    <button class="btn btn-outline" :disabled="!prev" @click="goBack">← Back</button>
    <button class="btn btn-text" @click="emit('reset')">Reset</button>
    <button class="btn btn-primary" :disabled="props.nextDisabled" @click="goNext">
      {{ props.nextLabel ?? 'Next →' }}
    </button>
  </div>
</template>

<style scoped>
.action-bar {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--c-border);
}
.btn[disabled] { opacity: 0.5; cursor: not-allowed; }
</style>
