<script setup lang="ts">
/**
 * Smart logo renderer for nav links/categories.
 *
 * Accepts a stored `logo` value (URL / Iconify class / inline SVG) plus an
 * optional fallback color, and renders the matching visual.
 */
import { parseLogo } from '../../composables/useNav'

const props = withDefaults(defineProps<{
  logo?: string | null
  /** Tailwind bg class used for the fallback letter chip */
  color?: string
  size?: string
}>(), {
  logo: null,
  color: 'bg-primary/10 text-primary',
  size: 'h-9 w-9'
})

const parsed = computed(() => parseLogo(props.logo))
// Fallback letter from the logo value or a generic icon.
const fallback = computed(() => {
  if (props.logo && !parsed.value.src) return '?'
  return ''
})
</script>

<template>
  <div
    class="flex items-center justify-center overflow-hidden rounded-lg"
    :class="[size, parsed.kind === 'none' ? color : '']"
  >
    <img
      v-if="parsed.kind === 'url'"
      :src="parsed.src"
      :alt="''"
      loading="lazy"
      class="h-full w-full object-contain"
    >
    <UIcon
      v-else-if="parsed.kind === 'icon'"
      :name="parsed.src!"
      class="h-1/2 w-1/2 shrink-0"
    />
    <span
      v-else-if="parsed.kind === 'svg'"
      class="flex h-full w-full items-center justify-center"
      v-html="parsed.src"
    />
    <span
      v-else
      class="text-lg font-bold"
    >{{ fallback || '—' }}</span>
  </div>
</template>