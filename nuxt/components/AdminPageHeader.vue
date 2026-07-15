<script setup lang="ts">
/**
 * AdminPageHeader — title + description + right-aligned action slot.
 * Used at the top of every /admin/* sub-page for a consistent look.
 */

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="admin-page-header">
    <div class="admin-page-header-text">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.admin-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--c-border);
}
.admin-page-header-text h1 {
  margin: 0;
  font-family: var(--font-headline);
  font-size: var(--font-xl);
  line-height: 1.1;
  color: var(--c-brand-dark-grey);
  font-weight: 400;
}
.admin-page-header-text p {
  margin: 6px 0 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-medium);
  max-width: 60ch;
}
.admin-page-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
</style>
