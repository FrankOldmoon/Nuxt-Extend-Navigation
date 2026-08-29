<script setup lang="ts">
/**
 * A single nav link card. Shows the site logo, title, short description and
 * tags. Clicking opens the target in a new tab and fire-and-forget increments
 * the click counter via `trackNavClick`.
 */
import type { NavLinkView } from '../../composables/useNav'
import { trackNavClick } from '../../composables/useNav'

const props = withDefaults(defineProps<{
  link: NavLinkView
  featured?: boolean
}>(), {
  featured: false
})

function openLink() {
  try {
    const u = new URL(props.link.url)
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      globalThis.open(props.link.url, '_blank', 'noopener,noreferrer')
    } else {
      // Raw scheme (mailto:, tel:, …) — still open it.
      globalThis.location.href = props.link.url
    }
  } catch {
    // Malformed URL — open as-is.
    globalThis.location.href = props.link.url
  }
  trackNavClick(props.link.id)
}
</script>

<template>
  <button
    type="button"
    class="group relative flex w-full items-center gap-3 rounded-xl border border-default bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg dark:bg-elevated dark:hover:shadow-primary/5"
    @click="openLink"
  >
    <span v-if="featured" class="absolute right-2 top-2">
      <UIcon name="i-lucide-star" class="h-3.5 w-3.5 text-primary" />
    </span>
    <NavLogo :logo="link.logo" :size="'h-11 w-11'" />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-sm font-semibold text-highlighted group-hover:text-primary">
        {{ link.title }}
      </span>
      <span v-if="link.description" class="line-clamp-2 text-xs text-muted">
        {{ link.description }}
      </span>
      <span v-if="link.tags.length" class="mt-0.5 flex flex-wrap gap-1">
        <span
          v-for="tag in link.tags"
          :key="tag"
          class="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted"
        >
          {{ tag }}
        </span>
      </span>
    </span>
    <UIcon name="i-lucide-external-link" class="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
  </button>
</template>