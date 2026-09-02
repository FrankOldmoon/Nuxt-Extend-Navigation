<script setup lang="ts">
/**
 * Navigation module — create/edit modal for a nav link, reusing the host's
 * generic dashboard form (DashboardCrudFormModal + DashboardCrudForm) and the
 * navLinks TableMeta fetched from `/api/dashboard/meta/navLinks`.
 *
 * Uses the generic dashboard data API (`/api/dashboard/data/navLinks`), so the
 * saved values follow the exact same rules as the admin dashboard's navLinks
 * page. Emits `saved(link)` after a successful create/update.
 */
import type { TableMetaWithOptions } from '~/types/dashboard'
import { resolveNavFavicon } from '../../composables/useNav'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'update'
  /** Link row to edit (update mode). */
  item?: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  'saved': [record: Record<string, unknown>]
}>()

const { t } = useI18n()
const toast = useToast()

const meta = ref<TableMetaWithOptions | null>(null)
const metaLoading = ref(false)

async function loadMeta() {
  if (meta.value) return
  metaLoading.value = true
  try {
    meta.value = await cGet<TableMetaWithOptions>('/api/dashboard/meta/navLinks')
  } catch (e) {
    toast.add({ title: extractErrorMessage(e, 'Failed to load form'), color: 'error' })
  } finally {
    metaLoading.value = false
  }
}

// ---- Form state ----
const modalMode = ref<'create' | 'update'>('create')
const editing = ref<Record<string, unknown> | null>(null)
const form = ref<Record<string, unknown>>({})
const saving = ref(false)
const errorMsg = ref('')
const fieldErrors = ref<Record<string, string>>({})

function initCreateForm() {
  const payload: Record<string, unknown> = {}
  for (const f of meta.value?.fields ?? []) {
    if (!f.showInForm) continue
    if (f.type === 'boolean') payload[f.key] = (f.validation?.required ?? true) ? true : false
    else if (f.nullable) payload[f.key] = null
    else if (f.type === 'number') payload[f.key] = 0
    else payload[f.key] = ''
  }
  form.value = payload
}

function openDialog() {
  modalMode.value = props.mode
  editing.value = props.item ?? null
  errorMsg.value = ''
  fieldErrors.value = {}
  loadMeta().then(() => {
    if (!meta.value) return
    if (props.mode === 'create') {
      initCreateForm()
    } else if (props.item?.id != null) {
      cGet<{ item: Record<string, unknown> }>(`/api/dashboard/data/navLinks/${props.item.id}`)
        .then(res => { form.value = res.item ?? {} })
        .catch(() => { form.value = { ...props.item! } })
    } else {
      initCreateForm()
    }
  })
}

watch(() => props.open, (v) => { if (v) openDialog() }, { immediate: true })

async function save() {
  if (!meta.value) return
  try {
    saving.value = true
    errorMsg.value = ''
    fieldErrors.value = {}
    const payload = { ...form.value }
    const errs = validateForm(meta.value as any, payload, modalMode.value)
    if (Object.keys(errs).length > 0) {
      fieldErrors.value = errs
      errorMsg.value = Object.values(errs).join('; ')
      return
    }
    if (modalMode.value === 'create') {
      await cPost('/api/dashboard/data/navLinks', payload)
      toast.add({ title: t('dashboard.crud.createSuccess'), color: 'success' })
    } else if (editing.value?.id != null) {
      await cPut(`/api/dashboard/data/navLinks/${editing.value.id}`, payload)
      toast.add({ title: t('dashboard.crud.updateSuccess'), color: 'success' })
    }
    emit('saved', form.value)
    emit('update:open', false)
  } catch (e) {
    errorMsg.value = extractErrorMessage(e, t('dashboard.crud.saveFailed'))
  } finally {
    saving.value = false
  }
}

function cancel() {
  emit('update:open', false)
}

// ---- Auto favicon on URL blur ----
const faviconAutoLoading = ref(false)

async function autoFetchFavicon() {
  const url = String(form.value?.url ?? '').trim()
  // Only auto-fill when the logo is not explicitly set yet, so a user-chosen
  // icon/favicon is never overwritten while editing an existing link.
  if (!url || String(form.value?.logo ?? '').trim()) return
  faviconAutoLoading.value = true
  try {
    const logo = await resolveNavFavicon(url)
    form.value = { ...form.value, logo }
    toast.add({ title: t('nav.logo.faviconFetched'), color: 'success' })
  } catch (e) {
    toast.add({
      title: t('nav.logo.faviconFailed'),
      color: 'error',
      description: extractErrorMessage(e)
    })
  } finally {
    faviconAutoLoading.value = false
  }
}
</script>

<template>
  <DashboardCrudFormModal
    :modal-open="props.open"
    :modal-title="modalMode === 'create' ? t('dashboard.crud.createLabel', { name: 'Nav Link' }) : t('dashboard.crud.editLabel', { name: 'Nav Link' })"
    :saving="saving"
    :error-msg="errorMsg"
    @update:modal-open="emit('update:open', $event)"
    @save="save"
    @cancel="cancel"
  >
    <template #form>
      <p v-if="metaLoading" class="py-8 text-center text-muted">{{ t('common.loading') }}</p>
      <div v-else-if="meta" class="space-y-4">
        <DashboardCrudForm
          :meta="meta"
          v-model="form"
          :mode="modalMode"
          :errors="fieldErrors"
        >
          <template #form-url="{ modelValue, update }">
            <div class="flex w-full items-center gap-2">
              <UInput
                :model-value="modelValue"
                id="field-url"
                type="url"
                placeholder="https://example.com"
                class="flex-1"
                @update:model-value="update"
                @blur="autoFetchFavicon"
              />
              <UIcon
                v-if="faviconAutoLoading"
                name="i-lucide-loader-2"
                class="h-4 w-4 animate-spin shrink-0 text-primary"
              />
            </div>
          </template>
          <template #form-logo="{ update, form: f, patch: patchField }">
            <NavLinkLogoField
              :model-value="String(f?.logo ?? '')"
              :url="String(f?.url ?? '')"
              :color="String(f?.logoColor ?? '')"
              @update:model-value="patchField('logo', $event)"
              @update:color="patchField('logoColor', $event)"
            />
          </template>
          <!-- logoColor is edited inline inside the logo field; hide this row -->
          <template #form-logoColor>
            <div class="h-0" />
          </template>
        </DashboardCrudForm>
      </div>
      <p v-else class="py-8 text-center text-muted">{{ t('dashboard.crud.loadingDetail') }}</p>
    </template>
  </DashboardCrudFormModal>
</template>