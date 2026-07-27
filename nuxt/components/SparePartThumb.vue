<script setup lang="ts">
/**
 * SparePartThumb — inline SVG illustrations for spare-part rows.
 * Each `kind` renders a distinctive silhouette so the list feels like a
 * catalogue with real product visuals rather than grey placeholder boxes.
 */
type Kind =
  | 'fan'
  | 'fan-alt'
  | 'heating-tray'
  | 'heating-element'
  | 'protection-grill'
  | 'defrost-hose'
  | 'connection-cable'
  | 'box'
  | 'evaporator'

const props = withDefaults(defineProps<{
  kind: Kind
  small?: boolean
  size?: number
  contain?: boolean            // when true, thumb keeps aspect + no bg frame
}>(), { size: 0 })

const boxSize = computed(() => props.size || (props.small ? 36 : 44))
const _uid    = useId()
</script>

<template>
  <span class="thumb" :class="{ 'thumb--sm': small, 'thumb--contain': contain }" :style="{ width: boxSize + 'px', height: boxSize + 'px' }" aria-hidden="true">
    <!-- Fan — front view with 6 blades -->
    <svg v-if="kind === 'fan'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f6f6f5" stroke="#d8d8d8"/>
      <circle cx="24" cy="24" r="17" fill="#e6e6e5"/>
      <g fill="#2f2f2e">
        <path d="M24 8c2 3 2 8 0 12-2-4-2-9 0-12z"/>
        <path d="M40 24c-3 2-8 2-12 0 4-2 9-2 12 0z"/>
        <path d="M24 40c-2-3-2-8 0-12 2 4 2 9 0 12z"/>
        <path d="M8 24c3-2 8-2 12 0-4 2-9 2-12 0z"/>
        <path d="M35 13c-1 3-4 6-8 7 1-4 4-7 8-7z"/>
        <path d="M13 35c1-3 4-6 8-7-1 4-4 7-8 7z"/>
      </g>
      <circle cx="24" cy="24" r="3.2" fill="#636362" stroke="#3c3c3b" stroke-width="0.6"/>
    </svg>

    <!-- Alternate fan — angled 4-blade -->
    <svg v-else-if="kind === 'fan-alt'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f2f2f1" stroke="#d8d8d8"/>
      <circle cx="24" cy="24" r="16" fill="#dedede"/>
      <g fill="#4b4b4a">
        <path d="M24 9c4 5 4 10 0 15-4-5-4-10 0-15z"/>
        <path d="M39 24c-5 4-10 4-15 0 5-4 10-4 15 0z"/>
        <path d="M24 39c-4-5-4-10 0-15 4 5 4 10 0 15z"/>
        <path d="M9 24c5-4 10-4 15 0-5 4-10 4-15 0z"/>
      </g>
      <circle cx="24" cy="24" r="3" fill="#3c3c3b"/>
    </svg>

    <!-- Heating element tray — bent finned tube -->
    <svg v-else-if="kind === 'heating-tray'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f6f6f5" stroke="#d8d8d8"/>
      <path d="M9 18h30v3H9zM9 27h30v3H9z" fill="#c5c5c5"/>
      <g stroke="#636362" stroke-width="1.4" fill="none" stroke-linecap="round">
        <path d="M11 12v24"/><path d="M15 12v24"/><path d="M19 12v24"/>
        <path d="M23 12v24"/><path d="M27 12v24"/><path d="M31 12v24"/>
        <path d="M35 12v24"/>
      </g>
      <path d="M8 12h32v2H8zm0 22h32v2H8z" fill="#3c3c3b"/>
    </svg>

    <!-- Heating element — coiled cartridge -->
    <svg v-else-if="kind === 'heating-element'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f6f6f5" stroke="#d8d8d8"/>
      <rect x="6" y="22" width="30" height="6" rx="1" fill="#8a8a89"/>
      <path d="M6 22l30 6M6 28l30-6" stroke="#3c3c3b" stroke-width="0.6"/>
      <path d="M36 20l6 5-6 5z" fill="#e67200"/>
      <circle cx="10" cy="25" r="1.6" fill="#3c3c3b"/>
      <circle cx="16" cy="25" r="1.6" fill="#3c3c3b"/>
      <circle cx="22" cy="25" r="1.6" fill="#3c3c3b"/>
      <circle cx="28" cy="25" r="1.6" fill="#3c3c3b"/>
    </svg>

    <!-- Protection grill — concentric rings + spokes -->
    <svg v-else-if="kind === 'protection-grill'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f6f6f5" stroke="#d8d8d8"/>
      <g stroke="#636362" stroke-width="1.2" fill="none">
        <circle cx="24" cy="24" r="17"/>
        <circle cx="24" cy="24" r="12"/>
        <circle cx="24" cy="24" r="7"/>
        <circle cx="24" cy="24" r="2.5" fill="#636362"/>
        <path d="M24 7v34M7 24h34M12 12l24 24M12 36l24-24"/>
      </g>
    </svg>

    <!-- Defrost hose — corrugated tube -->
    <svg v-else-if="kind === 'defrost-hose'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f6f6f5" stroke="#d8d8d8"/>
      <path d="M6 24q4 -8 8 0 t8 0 t8 0 t8 0 t8 0" stroke="#636362" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M6 24q4 -8 8 0 t8 0 t8 0 t8 0 t8 0" stroke="#c5c5c5" stroke-width="1" fill="none" stroke-dasharray="1 3" transform="translate(0 -1)"/>
    </svg>

    <!-- Connection cable — cable + plug -->
    <svg v-else-if="kind === 'connection-cable'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f6f6f5" stroke="#d8d8d8"/>
      <path d="M6 34c8 0 8-16 20-16s12 16 16 16" stroke="#3c3c3b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="4" y="30" width="8" height="8" rx="1" fill="#2666e0"/>
      <path d="M6 32v4M8 32v4M10 32v4" stroke="white" stroke-width="0.8"/>
      <circle cx="42" cy="34" r="3.5" fill="#e6e6e5" stroke="#636362"/>
      <circle cx="42" cy="34" r="1.5" fill="#636362"/>
    </svg>

    <!-- Evaporator / heat-exchanger — metallic diagonal fins in casing -->
    <svg v-else-if="kind === 'evaporator'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient :id="`ev-${_uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d8e2ee"/>
          <stop offset="1" stop-color="#a6b4c5"/>
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" :fill="`url(#ev-${_uid})`" stroke="#7a8899" stroke-width="0.5"/>
      <rect x="2" y="2" width="44" height="6" fill="#333f52"/>
      <rect x="2" y="40" width="44" height="6" fill="#333f52"/>
      <g stroke="#3a4a63" stroke-width="0.7" stroke-linecap="round">
        <path d="M-4 40l14 -32M0 40l14 -32M4 40l14 -32M8 40l14 -32M12 40l14 -32M16 40l14 -32M20 40l14 -32M24 40l14 -32M28 40l14 -32M32 40l14 -32M36 40l14 -32M40 40l14 -32M44 40l14 -32M48 40l14 -32"/>
      </g>
      <rect x="2" y="8" width="44" height="32" fill="none" stroke="#333f52" stroke-width="0.4"/>
    </svg>

    <!-- Box / packaging -->
    <svg v-else-if="kind === 'box'" :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#f6f6f5" stroke="#d8d8d8"/>
      <path d="M24 8L38 14v4L24 24 10 18v-4z" fill="#2666e0"/>
      <path d="M10 18v16l14 6V24z" fill="#5185e6"/>
      <path d="M38 18v16l-14 6V24z" fill="#268ff3"/>
      <path d="M17 11l14 6" stroke="white" stroke-width="0.8" opacity="0.6"/>
    </svg>

    <!-- Fallback -->
    <svg v-else :width="boxSize" :height="boxSize" viewBox="0 0 48 48" fill="none">
      <rect x="0.5" y="0.5" width="47" height="47" rx="4" fill="#ececec" stroke="#d8d8d8"/>
      <path d="M14 30h20M14 24h20M14 18h20" stroke="#c5c5c5" stroke-width="1.4"/>
    </svg>
  </span>
</template>

<style scoped>
.thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.thumb svg { display: block; width: 100%; height: 100%; }
.thumb--contain { border-radius: 0; }
.thumb--contain svg rect:first-child { display: none; }
</style>
