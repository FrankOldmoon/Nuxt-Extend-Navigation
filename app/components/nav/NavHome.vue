<script setup lang="ts">
/**
 * Navigation home — replaces the host project's public home page.
 *
 * A single-page nav site: a search bar across the top, then all active
 * categories each showing their active links. Type-ahead filtering is
 * client-side across title/description/tags.
 *
 * Category buttons below the search bar allow multi-select filtering.
 * Edit/delete on cards use an inline editor modal (NavLinkEditorModal) and
 * the generic batch soft-delete API, matching the blog post card pattern.
 */
import type { NavCategoryGroup } from '../../composables/useNav'
import { useNavData, richTextToPlain } from '../../composables/useNav'

const { t, locale } = useI18n()
const toast = useToast()
const { isAdmin } = useAuth()
const { data: rawGroups, status, refresh } = useNavData()

const search = ref('')
const q = computed(() => search.value.trim().toLowerCase())
// Pick localized text: Chinese first when locale is zh, else English (fallback to either).
const pick = (zh: string | null | undefined, en: string | null | undefined) =>
  locale.value === 'zh' ? (zh || en || '') : (en || zh || '')

// Multi-select category filter
const selectedCategoryIds = ref<Set<number>>(new Set())

function toggleCategory(id: number) {
  const s = new Set(selectedCategoryIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedCategoryIds.value = s
}

function isSelected(id: number): boolean {
  return selectedCategoryIds.value.has(id)
}

function clearCategories() {
  selectedCategoryIds.value = new Set()
}

const hasCategoryFilter = computed(() => selectedCategoryIds.value.size > 0)

const filteredGroups = computed<NavCategoryGroup[]>(() => {
  const list = rawGroups.value ?? []
  return list
    .filter((g) => !hasCategoryFilter.value || isSelected(g.id))
    .map((g) => ({
      ...g,
      name: pick(g.nameZh, g.name),
      description: pick(g.descriptionZh, g.description),
      links: g.links.filter((l) =>
        !q.value ||
        l.title.toLowerCase().includes(q.value) ||
        richTextToPlain(l.description).toLowerCase().includes(q.value) ||
        l.tags.some((tag) => tag.toLowerCase().includes(q.value))
      )
    }))
    .filter((g) => g.links.length > 0)
})

const isEmpty = computed(() => status.value === 'success' && filteredGroups.value.length === 0)

// All available categories (for the filter buttons)
const allCategories = computed(() => (rawGroups.value ?? []).map(g => ({ id: g.id, name: pick(g.nameZh, g.name), icon: g.icon })))

// ---- Colourful theming ----
// A fixed multi-colour palette. Each category is assigned a colour by its id so
// the filter chips, section headers and cards stay consistent across renders.
const PALETTE = ['#f43f5e', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#14b8a6']
function catColor(id: number): string {
  return PALETTE[Math.abs(id) % PALETTE.length]
}

// ---- Editor modal state ----
const editorOpen = ref(false)
const editorMode = ref<'create' | 'update'>('create')
const editorItem = ref<Record<string, unknown> | null>(null)

function openEdit(id: number) {
  editorMode.value = 'update'
  editorItem.value = { id }
  editorOpen.value = true
}

function openCreate() {
  editorMode.value = 'create'
  editorItem.value = null
  editorOpen.value = true
}

function onSaved() {
  refresh()
}

// ---- Delete ----
const deleting = ref(false)
async function confirmDelete(id: number) {
  deleting.value = true
  try {
    await cPost('/api/dashboard/data/navLinks/batch', {
      action: 'soft-delete',
      ids: [id]
    })
    toast.add({ title: t('dashboard.crud.deleted'), color: 'success' })
    refresh()
  } catch (e) {
    toast.add({ title: t('dashboard.crud.deleteFailed'), color: 'error', description: extractErrorMessage(e) })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <!-- Search bar (sticky) -->
    <section class="sticky top-12 z-20 border-b border-default bg-elevated/90 backdrop-blur">
      <div class="mx-auto max-w-5xl px-4 py-4">
        <div class="flex items-center gap-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            size="lg"
            :placeholder="t('nav.hero.searchPlaceholder')"
            class="flex-1"
            @keydown.esc="search = ''"
          />
          <UButton
            v-if="isAdmin"
            icon="i-lucide-plus"
            color="primary"
            size="lg"
            :title="t('nav.addLink')"
            @click="openCreate"
          />
        </div>

        <!-- Multicolour category filter chips -->
        <div v-if="allCategories.length" class="mt-3 flex flex-wrap items-center gap-2">
          <button
            v-for="cat in allCategories"
            :key="cat.id"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition"
            :style="isSelected(cat.id)
              ? { background: catColor(cat.id), borderColor: catColor(cat.id), color: '#fff' }
              : { color: catColor(cat.id), borderColor: `${catColor(cat.id)}66` }"
            @click="toggleCategory(cat.id)"
          >
            <UIcon v-if="cat.icon" :name="cat.icon" class="h-3.5 w-3.5" />
            {{ cat.name }}
          </button>
          <UButton
            v-if="hasCategoryFilter"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            @click="clearCategories"
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
          <span class="h-6 w-1.5 rounded-full" :style="{ background: catColor(g.id) }" />
          <span class="flex h-8 w-8 items-center justify-center rounded-lg" :style="{ background: `${catColor(g.id)}1f` }">
            <UIcon v-if="g.icon" :name="g.icon" class="h-4 w-4" :style="{ color: catColor(g.id) }" />
            <UIcon v-else name="i-lucide-folder" class="h-4 w-4" :style="{ color: catColor(g.id) }" />
          </span>
          <h2 class="text-lg font-bold text-highlighted">{{ g.name }}</h2>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-semibold"
            :style="{ background: `${catColor(g.id)}1f`, color: catColor(g.id) }"
          >{{ g.links.length }}</span>
          <p v-if="g.description" class="hidden text-xs text-muted sm:block">{{ g.description }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavLinkCard
            v-for="l in g.links"
            :key="l.id"
            :link="l"
            :accent="catColor(g.id)"
            :deleting="deleting"
            @edit="openEdit"
            @delete="confirmDelete"
          />
        </div>
      </div>
    </section>

    <!-- Editor modal -->
    <NavLinkEditorModal
      v-model:open="editorOpen"
      :mode="editorMode"
      :item="editorItem"
      @saved="onSaved"
    />
  </div>
</template>
