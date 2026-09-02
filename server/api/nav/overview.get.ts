/**
 * Public — group all active nav categories with their active links, ordered by
 * sortOrder. No auth: read-only frontend endpoint backing the home page.
 */
import { asc, and, eq, isNull } from 'drizzle-orm'
import { db } from '../../../../../server/database'
import { navCategories, navLinks } from '../../database/schema'

export interface NavOverviewGroup {
  id: number
  name: string
  nameZh: string | null
  slug: string
  description: string | null
  descriptionZh: string | null
  icon: string | null
  links: Array<{
    id: number
    title: string
    url: string
    description: Record<string, unknown> | null
    summary: string | null
    logo: string | null
    logoColor: string | null
    tags: string[]
    categoryId: number | null
    isFeatured: boolean
    sortOrder: number
    clickCount: number
  }>
}

export default defineEventHandler(async (): Promise<NavOverviewGroup[]> => {
  const cats = await db.select().from(navCategories)
    .where(and(eq(navCategories.isActive, true), isNull(navCategories.deletedAt)))
    .orderBy(asc(navCategories.sortOrder), asc(navCategories.id))

  const links = await db.select().from(navLinks)
    .where(and(eq(navLinks.isActive, true), isNull(navLinks.deletedAt)))
    .orderBy(asc(navLinks.sortOrder), asc(navLinks.id))

  // Group links by category in one pass.
  const byCategory = new Map<number | null, typeof links>()
  for (const l of links) {
    const arr = byCategory.get(l.categoryId) ?? []
    arr.push(l)
    byCategory.set(l.categoryId, arr)
  }

  const groups: NavOverviewGroup[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    nameZh: c.nameZh,
    slug: c.slug,
    description: c.description,
    descriptionZh: c.descriptionZh,
    icon: c.icon,
    links: (byCategory.get(c.id) ?? []).map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      description: l.description,
      summary: l.summary,
      logo: l.logo,
      logoColor: l.logoColor,
      tags: l.tags,
      categoryId: l.categoryId,
      isFeatured: l.isFeatured,
      sortOrder: l.sortOrder,
      clickCount: l.clickCount
    }))
  }))

  return groups
})
