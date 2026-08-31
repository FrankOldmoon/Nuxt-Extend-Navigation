/**
 * Navigation module — Drizzle schema.
 *
 * All navigation tables use the `nav_` prefix and live *only* inside this
 * module. They are registered with the host project's generic dashboard CRUD
 * from `plugins/nav.ts` via `registerSchema + registerDashboardTable`.
 *
 * Tables:
 *   - nav_categories  Flat one-level categories a link can belong to.
 *   - nav_links       The actual website/bookmark entries.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/pg-core'

export const navCategories = pgTable('nav_categories',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    // Localized (Chinese) name; falls back to `name` when empty.
    nameZh: varchar('name_zh', { length: 120 }),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    description: text('description'),
    // Iconify icon class shown as the category header (e.g. i-lucide-globe).
    icon: varchar('icon', { length: 64 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (t) => [
    index('nav_categories_slug_idx').on(t.slug),
    index('nav_categories_active_idx').on(t.isActive)
  ]
)

export const navLinks = pgTable('nav_links',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    // Localized (Chinese) title; falls back to `title` when empty.
    titleZh: varchar('title_zh', { length: 255 }),
    url: text('url').notNull(),
    // Rich-text description — stored as a Tiptap JSON document (jsonb).
    description: jsonb('description').$type<Record<string, unknown> | null>(),
    summary: varchar('summary', { length: 255 }),
    // Localized (Chinese) summary; falls back to `summary` when empty.
    summaryZh: varchar('summary_zh', { length: 255 }),
    // Logo/favicon representation. May contain, in precedence order:
    //   1. a plain URL (https://… / /api/files/…)  → rendered as <img>
    //   2. an Iconify class (i-lucide-globe)       → rendered as <UIcon>
    //   3. an inline <svg> string                  → rendered as raw HTML
    logo: text('logo'),
    // Free-form tags (matches the host `tags` convention).
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    categoryId: integer('category_id').references(() => navCategories.id, { onDelete: 'set null' }),
    isFeatured: boolean('is_featured').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    clickCount: integer('click_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (t) => [
    index('nav_links_category_idx').on(t.categoryId),
    index('nav_links_active_idx').on(t.isActive),
    index('nav_links_featured_idx').on(t.isFeatured)
  ]
)

export type NavCategory = typeof navCategories.$inferSelect
export type NewNavCategory = typeof navCategories.$inferInsert
export type NavLink = typeof navLinks.$inferSelect
export type NewNavLink = typeof navLinks.$inferInsert
