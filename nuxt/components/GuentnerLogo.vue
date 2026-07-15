<script setup lang="ts">
/**
 * Brand logo — renders the myGüntner colour SVG. The asset itself lives
 * in public/icons/my_guntner_color_logo.svg; keeping it as an <img> lets
 * the file cache and stops the header from re-flowing between text
 * fallback and real logo.
 */
</script>

<template>
  <NuxtLink to="/" class="brand" aria-label="myGüntner home">
    <img src="/icons/my_guntner_color_logo.svg" alt="myGüntner" />
  </NuxtLink>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.brand img {
  height: 28px;
  width: auto;
  display: block;
}
</style>
