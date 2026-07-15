<script setup lang="ts">
/**
 * Admin layout — wraps every /admin/* page in the AdminShell.
 * Use in a page via `definePageMeta({ layout: 'admin', middleware: 'admin' })`.
 */
</script>

<template>
  <div class="admin-layout">
    <AdminShell>
      <slot />
    </AdminShell>
  </div>
</template>

<style scoped>
.admin-layout {
  padding: var(--space-5) var(--space-6);
}
</style>
