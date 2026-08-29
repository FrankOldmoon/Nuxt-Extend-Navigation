<script setup lang="ts">
/**
 * Navigation home — replaces the host project's public home page.
 *
 * A single-page nav site: a hero with search, then all active categories each
 * showing their active links. Type-ahead filtering is client-side across
 * title/description/tags. SSR-driven via `useNavData` for hydration stability.
 */
import type { NavCategoryGroup } from '../../composables/useNav'
import { useNavData } from '../../composables/useNav'

const { t } = useI18n()
const { data: rawGroups, status } = useNavData()

const search = ref('')
const q = computed(() => search.value.trim().toLowerCase())

const filteredGroups = computed<NavCategoryGroup[]>(() => {
  const list = rawGroups.value ?? []
  if (!q.value) return list
  return list
    .map((g) => ({
      ...g,
      links: g.links.filter((l) =>
        l.title.toLowerCase().includes(q.value) ||
        (l.description ?? '').toLowerCase().includes(q.value) ||
        l.tags.some((tag) => tag.toLowerCase().includes(q.value))
      )
    }))
    .filter((g) => g.links.length > 0)
})

const isEmpty = computed(() => status.value === 'success' && filteredGroups.value.length === 0)
</script>

<template>
  <div class="min-h-screen bg-[#f7fafc]">
    <!-- Hero -->
    <section class="border-b border-default bg-white">
      <div class="mx-auto max-w-5xl px-4 py-14 text-center">
        <div class="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <UIcon name="i-lucide-compass" class="h-4 w-4" />
          {{ t('nav.hero.badge') }}
        </div>
        <h1 class="text-3xl font-bold text-highlighted sm:text-4xl">
          {{ t('nav.hero.title') }}
        </h1>
        <p class="mx-auto mt-3 max-w-xl text-muted">
          {{ t('nav.hero.subtitle') }}
        </p>

        <div class="mx-auto mt-8 max-w-md">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            size="lg"
            :placeholder="t('nav.hero.searchPlaceholder')"
            class="w-full"
            @keydown.esc="search = ''"
          />
        </div>
      </div>
    </section>

    <!-- Loading -->
    <section v-if="status === 'pending'" class="mx-auto max-w-5xl px-4 py-16 text-center">
      <span class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </section>

    <!-- Empty (no results) -->
    <section v-else-if="isEmpty" class="mx-auto max-w-5xl px-4 py-20 text-center">
      <UIcon name="i-lucide-search-x" class="mx-auto h-12 w-12 text-muted" />
      <p class="mt-4 text-muted">{{ t('nav.emptyNoResults') }}</p>
    </section>

    <!-- Groups -->
    <section v-else class="mx-auto max-w-5xl px-4 py-10">
      <div v-for="g in filteredGroups" :key="g.id" class="mb-10">
        <div class="mb-4 flex items-center gap-2.5 border-b border-default pb-3">
          <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <UIcon v-if="g.icon" :name="g.icon" class="h-4 w-4 text-primary" />
            <UIcon v-else name="i-lucide-folder" class="h-4 w-4 text-primary" />
          </span>
          <h2 class="text-lg font-bold text-highlighted">{{ g.name }}</h2>
          <span class="text-xs text-muted">{{ g.links.length }}</span>
          <p v-if="g.description" class="hidden text-xs text-muted sm:block">{{ g.description }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavLinkCard
            v-for="l in g.links"
            :key="l.id"
            :link="l"
            :featured="l.isFeatured"
          />
        </div>
      </div>
    </section>

    <footer class="border-t border-default bg-white py-6">
      <p class="text-center text-xs text-muted">{{ t('nav.footer') }}</p>
    </footer>
  </div>
</template>