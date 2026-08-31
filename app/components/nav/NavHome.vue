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

const { t } = useI18n()
const toast = useToast()
const { isLoggedIn } = useAuth()
const { data: rawGroups, status, refresh } = useNavData()

const search = ref('')
const q = computed(() => search.value.trim().toLowerCase())

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
const allCategories = computed(() => (rawGroups.value ?? []).map(g => ({ id: g.id, name: g.name, icon: g.icon })))

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
    <!-- Search bar -->
    <section class="sticky top-12 z-20 border-b border-default bg-elevated">
      <div class="mx-auto max-w-5xl px-4 py-4">
        <div class="flex items-center gap-3">
          <UColorModeButton />
          <UInput
            v-model="search"
            icon="i-lucide-search"
            size="lg"
            :placeholder="t('nav.hero.searchPlaceholder')"
            class="flex-1"
            @keydown.esc="search = ''"
          />
          <UButton
            v-if="isLoggedIn"
            icon="i-lucide-plus"
            color="primary"
            size="lg"
            :title="t('nav.addLink')"
            @click="openCreate"
          />
        </div>

        <!-- Category filter buttons -->
        <div v-if="allCategories.length" class="mt-3 flex flex-wrap items-center gap-2">
          <UButton
            v-for="cat in allCategories"
            :key="cat.id"
            size="xs"
            :color="isSelected(cat.id) ? 'primary' : 'neutral'"
            :variant="isSelected(cat.id) ? 'solid' : 'outline'"
            @click="toggleCategory(cat.id)"
          >
            {{ cat.name }}
          </UButton>
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