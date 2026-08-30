/**
 * Navigation module — Nitro plugin.
 *
 * Runs once at server startup and plugs the module into the host project:
 *   1. Registers the navigation Drizzle schema with the dashboard auto-discovery.
 *   2. Runs the module's own idempotent DB migrations.
 *   3. Registers the `navCategories` / `navLinks` tables into the host's generic
 *      dashboard CRUD (editable at `/dashboard/navCategories`, …).
 *   4. Adds default sidebar menu entries (merged into the shared
 *      `configs.dashboard.menu` whitelist).
 *   5. Seeds sample categories + links when the tables are empty.
 *
 * Everything navigation-specific lives in this module; the host only exposes the
 * generic `register*` extension points (imported via a path into the host's
 * server/ directory — the intended navigation→host seam).
 */
import { eq } from 'drizzle-orm'
import { db } from '../../../../server/database'
import { configs as configsTable } from '../../../../server/database/schema'
import {
  registerDrizzleSchema,
  registerDashboardTable
} from '../../../../server/utils/dashboard/tables'
import * as navSchema from '../database/schema'
import { runNavMigrations } from '../database/migrate'
import { navCategoryMeta, navLinkMeta } from '../utils/fields'

const DASHBOARD_MENU_KEY = 'dashboard.menu'

/** Build a Tiptap JSON doc from plain text (single paragraph) for the rich text `description` column. */
function richDoc(text: string): Record<string, unknown> {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

/** Menu entries contributed by this module (merged into the persisted menu). */
const NAV_MENU = [
  { table: 'navCategories', label: 'Nav Categories', icon: 'i-lucide-folder', order: 82 },
  { table: 'navLinks', label: 'Nav Links', icon: 'i-lucide-link', order: 84 }
]

export default defineNitroPlugin(async () => {
  console.log('[nav] initializing navigation module')

  // 1. Make the navigation tables discoverable by the generic dashboard.
  registerDrizzleSchema(navSchema)

  // 2. Create/upgrade the navigation tables (idempotent).
  await runNavMigrations()

  // 3. Register the tables into the host CRUD + admin sidebar menu.
  registerDashboardTable(
    { meta: navCategoryMeta, getTable: () => navSchema.navCategories },
    { menuOrder: 82 }
  )
  registerDashboardTable(
    { meta: navLinkMeta, getTable: () => navSchema.navLinks },
    { menuOrder: 84 }
  )

  // 4. Merge this module's menu entries into the persisted `dashboard.menu`
  //    whitelist (non-intrusive — existing rows are preserved).
  await ensureMenu()

  // 5. Seed sample data when the navigation is empty (idempotent).
  await seedDefaults()
})

async function ensureMenu(): Promise<void> {
  try {
    const rows = await db
      .select({ value: configsTable.value })
      .from(configsTable)
      .where(eq(configsTable.key, DASHBOARD_MENU_KEY))

    let list: Array<{ table: string; label?: unknown; icon?: unknown; order?: unknown; hidden?: unknown }> = []
    const raw = rows[0]?.value
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) list = parsed
      } catch {
        list = []
      }
    }

    // Append every nav entry that is not yet present.
    const known = new Set(list.map(i => i.table))
    let changed = false
    for (const m of NAV_MENU) {
      if (!known.has(m.table)) {
        list.push({ table: m.table, label: m.label, icon: m.icon, order: m.order })
        changed = true
      }
    }

    if (changed) {
      await db
        .insert(configsTable)
        .values({
          key: DASHBOARD_MENU_KEY,
          value: JSON.stringify(list),
          type: 'json',
          description: 'Dashboard left-sidebar menu config (JSON array)',
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: configsTable.key,
          set: { value: JSON.stringify(list), updatedAt: new Date() }
        })
      console.log('[nav] dashboard menu updated')
    }
  } catch (e) {
    console.warn('[nav] menu ensure failed (ignored):', e)
  }
}

async function seedDefaults(): Promise<void> {
  try {
    const existing = await db
      .select({ id: navSchema.navCategories.id })
      .from(navSchema.navCategories)
      .limit(1)
    if (existing.length > 0) return

    const [dev] = await db.insert(navSchema.navCategories)
      .values({ name: 'Developer Tools', slug: 'developer-tools', description: 'Tools for developers.', icon: 'i-lucide-wrench', sortOrder: 10 })
      .returning({ id: navSchema.navCategories.id })
    const [ai] = await db.insert(navSchema.navCategories)
      .values({ name: 'AI & Productivity', slug: 'ai-productivity', description: 'AI assistants and productivity apps.', icon: 'i-lucide-sparkles', sortOrder: 20 })
      .returning({ id: navSchema.navCategories.id })

    if (!dev || !ai) return

    await db.insert(navSchema.navLinks).values([
      {
        title: 'GitHub', url: 'https://github.com',
        summary: '代码托管与协作平台',
        description: richDoc('The world\'s leading platform for software development and collaboration. Host code, manage projects, and build software with millions of developers worldwide.'),
        logo: 'i-lucide-brand-github', categoryId: dev.id, isFeatured: true, sortOrder: 1
      },
      {
        title: 'Stack Overflow', url: 'https://stackoverflow.com',
        summary: '程序员问答社区',
        description: richDoc('Q&A for professional and enthusiast programmers. Find answers to your coding questions, share knowledge, and build your career.'),
        logo: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico', categoryId: dev.id, sortOrder: 2
      },
      {
        title: 'ChatGPT', url: 'https://chatgpt.com',
        summary: 'AI 对话助手',
        description: richDoc('Conversational AI assistant by OpenAI. Get instant answers, generate content, brainstorm ideas, and automate tasks with natural language.'),
        logo: 'i-lucide-bot', categoryId: ai.id, isFeatured: true, sortOrder: 1
      }
    ])
    console.log('[nav] seeded sample categories + links')
  } catch (e) {
    console.warn('[nav] seed failed (ignored):', e)
  }
}