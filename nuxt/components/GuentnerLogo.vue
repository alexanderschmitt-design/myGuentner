<script setup lang="ts">
// Kompakter Text-Logo-Ersatz. Das echte myGüntner-SVG liegt in
// public/icons/myGuentner.svg — wir preloaden es nicht, damit Header schneller
// LCP hat. Der Text-Fallback ist visuell nah dran (bunte "my"-Balken + Güntner-Wort).
</script>

<template>
  <NuxtLink to="/" class="brand" aria-label="myGüntner home">
    <span class="bars" aria-hidden="true">
      <span class="bar b1"></span>
      <span class="bar b2"></span>
      <span class="bar b3"></span>
      <span class="bar b4"></span>
    </span>
    <span class="wordmark">
      <span class="my">my</span><span class="guentner">Güntner</span>
    </span>
  </NuxtLink>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--c-primary);
  text-decoration: none;
  font-family: 'DM Sans', system-ui, sans-serif;
}
.bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
  height: 22px;
}
.bar { width: 4px; border-radius: 2px; }
.bar.b1 { height: 10px; background: var(--c-primary); }
.bar.b2 { height: 16px; background: var(--c-primary); }
.bar.b3 { height: 22px; background: var(--c-site); }
.bar.b4 { height: 14px; background: var(--c-site); }
.wordmark { font-size: 1.125rem; letter-spacing: -0.01em; }
.my { font-weight: 400; }
.guentner { font-weight: 700; }
</style>
