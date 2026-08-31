/**
 * Navigation module — TableMeta for the host project's generic dashboard CRUD.
 *
 * Returning `custom: false` means the host's generic list/form/detail, advanced
 * filters and soft-delete apply to the navigation tables for free. Field labels
 * resolve through the module's own i18n files
 * (`dashboard.fields.<table>.<field>` / `dashboard.tables.<table>`).
 */
// Type-only import from the host (erased at build time — the runtime value
// lives in this module). Structural typing lets us pass plain TableMeta objects.
import type { TableMeta } from '../../../../app/types/dashboard'

export const navCategoryMeta: TableMeta = {
  table: 'navCategories',
  label: 'Nav Categories',
  icon: 'i-lucide-folder',
  custom: false,
  fields: [
    { key: 'id', label: 'ID', type: 'number', nullable: false, showInForm: false, showInTable: true, showInDetail: true, editable: false },
    { key: 'name', label: 'Name', type: 'text', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { required: true, maxLength: 120 } },
    { key: 'nameZh', label: 'Name (中文)', type: 'text', nullable: true, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { maxLength: 120 }, helpText: '中文名称，留空则显示英文 Name。' },
    { key: 'slug', label: 'Slug', type: 'text', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { required: true, maxLength: 160 }, helpText: 'URL segment for this category (unique).' },
    { key: 'description', label: 'Description', type: 'textarea', nullable: true, showInForm: true, showInTable: false, showInDetail: true, editable: true },
    { key: 'icon', label: 'Icon', type: 'icon', nullable: true, showInForm: true, showInTable: true, showInDetail: true, editable: true, helpText: 'Iconify class (e.g. i-lucide-globe).' },
    { key: 'sortOrder', label: 'Sort order', type: 'number', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true },
    { key: 'createdAt', label: 'Created at', type: 'datetime', nullable: false, showInForm: false, showInTable: true, showInDetail: true, editable: false },
    { key: 'updatedAt', label: 'Updated at', type: 'datetime', nullable: false, showInForm: false, showInTable: false, showInDetail: true, editable: false }
  ],
  features: {
    softDelete: true,
    search: ['name', 'slug', 'description'],
    defaultSort: { field: 'sortOrder', order: 'asc' }
  }
}

export const navLinkMeta: TableMeta = {
  table: 'navLinks',
  label: 'Nav Links',
  icon: 'i-lucide-link',
  custom: false,
  fields: [
    { key: 'id', label: 'ID', type: 'number', nullable: false, showInForm: false, showInTable: true, showInDetail: true, editable: false },
    { key: 'title', label: 'Title', type: 'text', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { required: true, maxLength: 255 } },
    { key: 'titleZh', label: 'Title (中文)', type: 'text', nullable: true, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { maxLength: 255 }, helpText: '中文标题，留空则显示英文 Title。' },
    { key: 'url', label: 'URL', type: 'hyperlink', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { required: true } },
    { key: 'logo', label: 'Logo', type: 'icon', nullable: true,
      showInForm: true, showInTable: true, showInDetail: true, editable: true
    },
    { key: 'description', label: 'Description', type: 'richEditor', nullable: true, showInForm: true, showInTable: false, showInDetail: true, editable: true, widthClass: 'w-48' },
    { key: 'summary', label: 'Summary', type: 'text', nullable: true, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { maxLength: 255 } },
    { key: 'summaryZh', label: 'Summary (中文)', type: 'text', nullable: true, showInForm: true, showInTable: true, showInDetail: true, editable: true, validation: { maxLength: 255 }, helpText: '中文简介，留空则显示英文 Summary。' },
    { key: 'tags', label: 'Tags', type: 'tags', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true },
    { key: 'categoryId', label: 'Category', type: 'relation', nullable: true, showInForm: true, showInTable: true, showInDetail: true, editable: true, relation: { table: 'navCategories', labelKey: 'name', valueKey: 'id', creatable: true, slugField: 'slug' } },
    { key: 'isFeatured', label: 'Featured', type: 'boolean', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true },
    { key: 'sortOrder', label: 'Sort order', type: 'number', nullable: false, showInForm: true, showInTable: true, showInDetail: true, editable: true },
    { key: 'clickCount', label: 'Clicks', type: 'number', nullable: false, showInForm: false, showInTable: true, showInDetail: true, editable: false },
    { key: 'createdAt', label: 'Created at', type: 'datetime', nullable: false, showInForm: false, showInTable: true, showInDetail: true, editable: false },
    { key: 'updatedAt', label: 'Updated at', type: 'datetime', nullable: false, showInForm: false, showInTable: false, showInDetail: true, editable: false }
  ],
  features: {
    softDelete: true,
    search: ['title', 'url', 'tags'],
    defaultSort: { field: 'sortOrder', order: 'asc' }
  }
}
