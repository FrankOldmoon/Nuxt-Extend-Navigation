<script setup lang="ts">
/**
 * Nav link "logo/icon" form field.
 *
 * Layout (left → right):
 *   1. A text input holding the raw value — an Iconify class (i-lucide-xxx),
 *      a favicon/image URL, or empty.
 *   2. A live preview of the current value; clicking it opens the shared icon
 *      picker popup so an icon class can be chosen.
 *   3. A button that asks the backend for the current URL's favicon and fills
 *      the returned URL back into the field.
 *
 * The stored value is interpreted later by `parseLogo` (URL → <img>,
 * `i-` class → <UIcon>, otherwise the default web icon).
 */
import { filterLucideIcons } from '~/utils/lucideIcons'
import { resolveNavFavicon } from '../../composables/useNav'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  /** Current link URL, used to fetch the favicon. */
  url?: string | null
  /** Icon colour (hex) applied to the logo when it is an icon class. */
  color?: string | null
}>(), {
  modelValue: '',
  url: null,
  color: null
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:color': [value: string]
}>()

const { t } = useI18n()
const toast = useToast()

const pickerOpen = ref(false)
const search = ref('')
const faviconLoading = ref(false)
const svgOpen = ref(false)
const svgDraft = ref('')

const value = computed({
  get: () => props.modelValue ?? '',
  set: (v: string) => emit('update:modelValue', v)
})

// Icon colour, chosen inside the icon picker popup.
const colorValue = computed({
  get: () => props.color ?? '',
  set: (v: string) => emit('update:color', v)
})

// Small preset swatches offered inside the picker.
const PRESET = ['#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#8b5cf6', '#6366f1']
function isPreset(c: string): boolean {
  return colorValue.value.toLowerCase() === c.toLowerCase()
}

const filteredIcons = computed(() => filterLucideIcons(search.value))

/** Parse the current value for the preview (same rules as `parseLogo`). */
const preview = computed(() => {
  const s = value.value.trim()
  if (s.startsWith('<svg')) return { kind: 'svg', src: s } as const
  if (/^https?:\/\//i.test(s) || s.startsWith('/') || s.startsWith('data:')) {
    return { kind: 'url', src: s } as const
  }
  if (s.startsWith('i-')) return { kind: 'icon', src: s } as const
  return { kind: 'none' } as const
})

function pick(icon: string) {
  value.value = icon
  pickerOpen.value = false
  search.value = ''
}

async function fetchFavicon() {
  const url = (props.url ?? '').trim()
  if (!url) {
    toast.add({ title: t('nav.logo.faviconMissingUrl'), color: 'warning' })
    return
  }
  faviconLoading.value = true
  try {
    const logo = await resolveNavFavicon(url)
    value.value = logo
    toast.add({ title: t('nav.logo.faviconFetched'), color: 'success' })
  } catch (e) {
    toast.add({
      title: t('nav.logo.faviconFailed'),
      color: 'error',
      description: extractErrorMessage(e)
    })
  } finally {
    faviconLoading.value = false
  }
}

// Clear the search every time the picker opens.
watch(pickerOpen, (v) => { if (v) search.value = '' })

// Pre-fill the SVG draft with the current value when it is inline SVG.
watch(svgOpen, (v) => {
  if (v) svgDraft.value = preview.value.kind === 'svg' ? value.value.trim() : ''
})

function applySvg() {
  value.value = svgDraft.value.trim()
  svgOpen.value = false
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UInput
      :model-value="value"
      class="flex-1"
      placeholder="i-lucide-globe 或 https://example.com/favicon.ico"
      @update:model-value="value = $event as string"
    />

    <!-- Live preview (click to open the icon picker) -->
    <button
      type="button"
      class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-default hover:bg-elevated"
      :title="t('nav.logo.pickIcon')"
      @click="pickerOpen = true"
    >
      <img
        v-if="preview.kind === 'url'"
        :src="preview.src"
        alt=""
        class="h-full w-full object-contain"
      >
      <span
        v-else-if="preview.kind === 'svg'"
        class="flex h-full w-full items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:h-4 [&>svg]:w-4"
        v-html="preview.src"
      />
      <UIcon
        v-else-if="preview.kind === 'icon'"
        :name="preview.src"
        class="h-4 w-4 text-muted"
      />
      <UIcon v-else name="i-lucide-globe" class="h-4 w-4 text-muted" />
    </button>

    <!-- Set a custom inline SVG -->
    <UButton
      icon="i-lucide-code-xml"
      variant="outline"
      :title="t('nav.logo.svgTooltip')"
      @click="svgOpen = true"
    />

    <!-- Fetch the current URL's favicon from the backend -->
    <UButton
      icon="i-lucide-globe"
      variant="outline"
      :loading="faviconLoading"
      :disabled="!url"
      :title="t('nav.logo.fetchFavicon')"
      @click="fetchFavicon"
    />
  </div>

  <UModal
    v-model:open="pickerOpen"
    :title="t('dashboard.menu.selectIcon')"
    class="max-w-2xl"
  >
    <template #body>
      <div class="space-y-3">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="t('common.searchPlaceholder')"
          class="w-full"
        />
        <div class="grid max-h-[60vh] grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8">
          <button
            v-for="icon in filteredIcons"
            :key="icon"
            type="button"
            class="flex flex-col items-center gap-1 rounded-lg border border-default p-2 transition hover:bg-elevated"
            :class="{ 'border-primary bg-primary/10': value === icon }"
            @click="pick(icon)"
          >
            <UIcon :name="icon" class="h-5 w-5" :style="colorValue ? { color: colorValue } : undefined" />
            <span class="w-full truncate text-center text-[10px] text-muted">
              {{ icon.replace('i-lucide-', '') }}
            </span>
          </button>
        </div>

        <!-- Icon colour picker -->
        <div class="flex flex-wrap items-center gap-2 border-t border-default pt-3">
          <span class="text-xs text-muted">{{ t('nav.logo.pickColor') }}</span>
          <UInput
            type="color"
            :model-value="colorValue || '#3b82f6'"
            class="h-8 w-9 shrink-0 !p-0"
            aria-label="color"
            @update:model-value="colorValue = $event as string"
          />
          <button
            v-for="c in PRESET"
            :key="c"
            type="button"
            class="h-6 w-6 rounded-full border transition hover:scale-110"
            :class="{ 'ring-2 ring-primary ring-offset-2': isPreset(c) }"
            :style="{ background: c }"
            @click="colorValue = c"
          />
          <UInput
            :model-value="colorValue"
            class="w-24 shrink-0"
            :placeholder="'#3b82f6'"
            @update:model-value="colorValue = $event as string"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="svgOpen" :title="t('nav.logo.svgTitle')" class="max-w-2xl">
    <template #body>
      <div class="space-y-3">
        <p class="text-xs text-muted">{{ t('nav.logo.svgHelp') }}</p>
        <UTextarea
          v-model="svgDraft"
          :rows="8"
          class="w-full"
          monospace
          placeholder="<svg viewBox='0 0 24 24'>…</svg>"
        />
        <div class="flex justify-end gap-2 pt-1">
          <UButton color="neutral" variant="ghost" @click="svgOpen = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton color="primary" @click="applySvg">{{ t('common.confirm') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>