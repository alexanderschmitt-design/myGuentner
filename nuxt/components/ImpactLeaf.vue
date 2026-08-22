<script setup lang="ts">
/**
 * ImpactLeaf — inline SVG rendering of Güntner's Impact° leaf icon.
 *
 * Inlined (vs. loading `/icons/icon_impact.svg`) so it always renders even
 * when the external file is unavailable, cached stale, or blocked. The old
 * SVG file is a 63 KB base64-embedded raster; this vector version scales
 * cleanly at any button size and doesn't touch the network.
 *
 * Sized by its parent via CSS (width/height on the class the parent applies).
 */
</script>

<template>
  <svg
    class="impact-leaf"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M11.9 0C11.4 1.2 10.5 2.3 9.8 2.9C9.7 3 9.5 3.1 9.3 3C9.1 3 9 2.9 8.9 2.7C8.5 1.9 7.8 0.7 7.8 0.7C9.1 0.3 10.5 0 11.9 0ZM13.9 0.1C15.3 0.3 16.6 0.8 17.8 1.4C18 1.4 18.1 1.6 18.1 1.8C18.1 2 18.1 2.2 18.1 2.3C17.5 3.3 16.3 4.7 14.4 5.8C14.4 5.8 14.2 5.8 14.1 5.8C14.1 5.8 14 5.6 14.1 5.5C14.4 4.5 14.8 2.2 14 0L13.9 0.1ZM19.9 3C21.2 4.2 22.2 5.7 22.9 7.3C23 7.6 22.9 7.8 22.9 8.1C22.8 8.3 22.6 8.5 22.3 8.6C20.2 9.2 18.1 8.7 16.7 7.5C16.6 7.4 16.5 7.2 16.5 7C16.5 6.8 16.6 6.7 16.8 6.6C18.2 5.8 19.3 4 19.9 3ZM13.1 3.5C13.1 3.3 12.9 3.2 12.8 3.1C12.6 3.1 12.5 3.1 12.3 3.1C11.8 3.5 11.1 4.1 10.6 4.5C10.2 4.8 10.1 5.3 10.2 5.8C10.5 6.8 10.9 8.8 10.6 10.5V10.7H10.8C12.7 8.2 13.4 5.8 13 3.4L13.1 3.5ZM5.7 1.8C6.1 1.6 6.5 1.6 6.8 2C7.6 2.9 8.4 4.2 9 6.3C9.6 8.7 8.7 11.1 8.2 12.2C8.2 12.2 8 12.4 7.9 12.3C7.8 12.3 7.7 12.3 7.7 12.1C7.3 10.7 6.2 7.4 2.9 5.8C2.7 5.7 2.5 5.5 2.5 5.2C2.5 4.9 2.5 4.7 2.7 4.5C3.5 3.5 4.5 2.6 5.7 1.9V1.8ZM23.8 10C23.9 10.6 24 11.3 24 12C24 12.7 24 13.7 23.7 14.5C23.7 14.5 22.9 14.7 22.2 14.9C21.7 15 21.2 14.8 21.1 14.3C20.9 13.8 20.7 13.1 20.5 12.7C20.5 12.4 20.5 12.2 20.6 11.9C20.7 11.8 20.8 11.6 21 11.4C21.5 10.8 22.2 10.4 22.9 10.2C23.4 10.1 23.8 10 23.8 10ZM11.3 15.1C11 15.1 10.7 14.9 10.6 14.7C10.4 14.4 10.4 14.1 10.6 13.8C11.4 12.3 13.1 9.8 15.9 9.1C18.5 11.3 19.3 13.1 19.4 14.3C16.2 13.3 14.6 15.2 11.3 15.1ZM15.9 16.8C15.9 16.8 17.6 16.2 18.7 15.9C19.4 15.7 20.1 15.9 20.6 16.4C21 16.9 21.6 17.5 22 18C22.1 18.2 22.2 18.4 22 18.6C22 18.8 21.7 18.9 21.5 19C20.9 19 20.2 19.1 19.6 19.2C18.8 19.2 18 19 17.4 18.5C16.7 17.8 15.7 16.9 15.7 16.9L15.9 16.8ZM0.8 7.7C0.8 7.7 1.5 8.1 2.4 8.5C5.5 10.1 7.3 13.4 6.9 16.9C6.8 18.4 6.4 20.2 5.8 22.3C2.3 20.1 0 16.3 0 12C0 7.7 0.3 9 0.8 7.7ZM6.8 22.8C7.1 21.8 7.6 20.1 8.4 18.7C9.2 17.4 10.7 16.7 12.2 17C14.5 17.4 16.6 18.5 18.4 21.5C18.4 21.6 18.5 21.8 18.4 22C18.4 22.2 18.3 22.3 18.1 22.4C16.3 23.5 14.2 24.1 11.9 24.1C9.6 24.1 8.3 23.7 6.7 22.9L6.8 22.8Z"
      fill="currentColor"
    />
  </svg>
</template>

<style scoped>
/* Size is set by the parent via the class it passes in (e.g.
   .imp-combo-leading, .imp-trailing > .impact-leaf). The path uses
   `fill: currentColor` so callers can retint via CSS `color` — the
   default is Güntner's Impact° green (same token the LeafScore leaves
   use when active). */
.impact-leaf {
  display: block;
  flex-shrink: 0;
  color: var(--c-impact-green);
}
</style>
