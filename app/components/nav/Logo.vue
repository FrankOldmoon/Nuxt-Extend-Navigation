<script setup lang="ts">
/**
 * Smart logo renderer for nav links/categories.
 *
 * Accepts a stored `logo` value (URL / Iconify class / inline SVG) and
 * renders the matching visual. Falls back to a link icon when empty.
 */
import { parseLogo } from '../../composables/useNav'

const props = withDefaults(defineProps<{
  logo?: string | null
  size?: string
}>(), {
  logo: null,
  size: 'h-9 w-9'
})

const parsed = computed(() => parseLogo(props.logo))
</script>

<template>
  <div
    class="flex items-center justify-center overflow-hidden rounded-lg"
    :class="[size]"
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
      class="flex h-full w-full items-center justify-center text-muted"
    >
      <UIcon name="i-lucide-link" class="h-1/2 w-1/2" />
    </span>
  </div>
</template>