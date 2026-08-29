<script setup lang="ts">
/**
 * A single nav link card. Shows the site logo, title, short description and
 * tags. Clicking opens the target in a new tab and fire-and-forget increments
 * the click counter via `trackNavClick`.
 *
 * Top-right edit/delete buttons link to the admin dashboard for management.
 */
import type { NavLinkView } from '../../composables/useNav'
import { trackNavClick } from '../../composables/useNav'

const props = defineProps<{
  link: NavLinkView
}>()

const { t } = useI18n()
const toast = useToast()

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

const deleting = ref(false)
async function confirmDelete() {
  const ok = globalThis.confirm(t('common.confirmDelete'))
  if (!ok) return
  deleting.value = true
  try {
    await $fetch('/api/dashboard/data/navLinks/batch', {
      method: 'POST',
      body: { action: 'soft-delete', ids: [props.link.id] }
    })
    toast.add({ title: t('dashboard.crud.deleted'), color: 'success' })
    // Reload the page to reflect the deletion
    globalThis.location.reload()
  } catch (e) {
    toast.add({ title: t('dashboard.crud.deleteFailed'), color: 'error', description: extractErrorMessage(e) })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div
    class="group relative flex w-full items-center gap-3 rounded-xl border border-default bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg dark:bg-elevated dark:hover:shadow-primary/5"
  >
    <!-- Top-right edit/delete buttons -->
    <div class="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
      <UButton
        icon="i-lucide-pencil"
        size="2xs"
        color="neutral"
        variant="ghost"
        :title="t('common.edit')"
        :to="`/dashboard/navLinks?id=${link.id}`"
        @click.stop
      />
      <UButton
        icon="i-lucide-trash-2"
        size="2xs"
        color="error"
        variant="ghost"
        :title="t('common.delete')"
        :loading="deleting"
        @click.stop="confirmDelete"
      />
    </div>

    <!-- Clickable area (opens the link) -->
    <button
      type="button"
      class="flex w-full items-center gap-3 text-left"
      @click="openLink"
    >
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
  </div>
</template>