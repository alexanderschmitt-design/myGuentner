<script setup lang="ts">
/**
 * InfoIcon — small blue "ⓘ" circle used next to field labels.
 * Reference: layouts show a solid brand-blue circle with a white italic "i".
 */
defineProps<{ title?: string }>()
</script>

<template>
  <span class="info-badge" :title="title" role="img" aria-label="More info">i</span>
</template>
