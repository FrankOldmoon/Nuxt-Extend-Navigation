<script setup lang="ts">
/**
 * A single nav link card. Shows the site logo, title, short description and
 * tags. Clicking opens the target in a new tab and fire-and-forget increments
 * the click counter via `trackNavClick`.
 *
 * Top-right edit/delete buttons emit events to the parent for handling.
 */
import type { NavLinkView } from '../../composables/useNav'
import { trackNavClick } from '../../composables/useNav'

const props = defineProps<{
  link: NavLinkView
  deleting?: boolean
}>()

const emit = defineEmits<{
  edit: [id: number]
  delete: [id: number]
}>()

const descOpen = ref(false)

function openLink() {
  try {
    const u = new URL(props.link.url)
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      globalThis.open(props.link.url, '_blank', 'noopener,noreferrer')
    } else {
      globalThis.location.href = props.link.url
    }
  } catch {
    globalThis.location.href = props.link.url
  }
  trackNavClick(props.link.id)
}
</script>

<template>
  <div
    class="group relative flex h-24 items-center gap-3 rounded-xl border border-default bg-elevated p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg dark:bg-elevated dark:hover:shadow-primary/5"
  >
    <!-- Top-right buttons (always visible) -->
    <div class="absolute right-2 top-2 z-10 flex items-center gap-1" @click.stop>
      <UButton
        icon="i-lucide-pencil"
        size="2xs"
        color="neutral"
        variant="ghost"
        title="Edit"
        @click="emit('edit', link.id)"
      />
      <BaseConfirmButton
        icon="i-lucide-trash-2"
        size="2xs"
        square
        color="error"
        variant="ghost"
        title="Delete"
        :loading="deleting"
        @confirm="emit('delete', link.id)"
      />
      <!-- Description info icon (rightmost, only when description exists) -->
      <span
        v-if="link.description"
        class="flex h-5 w-5 cursor-pointer items-center justify-center rounded hover:bg-muted"
        @click.stop="descOpen = true"
      >
        <UIcon name="i-lucide-alert-circle" class="h-3.5 w-3.5 text-muted" />
      </span>
      <UModal v-model:open="descOpen" :title="link.title" class="max-w-lg">
        <template #body>
          <div class="prose prose-sm max-w-none p-4">
            <BaseMarkdownViewer :source="link.description" />
          </div>
        </template>
      </UModal>
    </div>

    <!-- Clickable area (opens the link) -->
    <button
      type="button"
      class="flex w-full items-center gap-3 text-left"
      @click="openLink"
    >
      <NavLogo :logo="link.logo" :size="'h-11 w-11 shrink-0'" />
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <UTooltip v-if="link.title.length > 30" :text="link.title">
          <span class="truncate text-sm font-semibold text-highlighted group-hover:text-primary">
            {{ link.title }}
          </span>
        </UTooltip>
        <span v-else class="truncate text-sm font-semibold text-highlighted group-hover:text-primary">
          {{ link.title }}
        </span>
        <!-- Summary text -->
        <span class="line-clamp-2 text-xs text-muted">{{ link.summary }}</span>
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
    </button>
  </div>
</template>