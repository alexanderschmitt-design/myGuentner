<script setup lang="ts">
import type { StepId } from '~/composables/useFlows';

const props = defineProps<{ current: StepId }>();
const { activeSteps, stepLabels, stepRoutes } = useFlows();

const steps = computed(() => activeSteps());
</script>

<template>
  <ol class="step-wizard">
    <li
      v-for="(s, i) in steps"
      :key="s"
      :class="{ 'is-current': s === props.current, 'is-done': steps.indexOf(props.current) > i }"
    >
      <NuxtLink :to="stepRoutes[s]" class="step">
        <span class="num">{{ i + 1 }}</span>
        <span class="label">{{ stepLabels[s] }}</span>
      </NuxtLink>
    </li>
  </ol>
</template>

<style scoped>
.step-wizard {
  list-style: none;
  margin: 0 0 var(--space-5);
  padding: 0;
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--c-border);
}
.step-wizard li { flex: 1; }
.step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  color: var(--c-text-muted);
  text-decoration: none;
  border-bottom: 3px solid transparent;
  font-size: 0.875rem;
  transition: var(--transition-accent);
}
.num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--c-surface-muted);
  font-weight: 600;
  font-size: 0.8rem;
}
.is-current .step { color: var(--c-accent); border-bottom-color: var(--c-accent); font-weight: 600; }
.is-current .num { background: var(--c-accent); color: #fff; }
.is-done .num { background: var(--c-success); color: #fff; }
</style>
