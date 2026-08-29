/**
 * Public — increment the click counter for a nav link. Fire-and-forget from the
 * front-end; best-effort (returns 200 even for unknown ids).
 */
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../../../../server/database'
import { navLinks } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: number }>(event)
  const id = Number(body?.id)
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false }
  }
  await db.update(navLinks)
    .set({ clickCount: sql`${navLinks.clickCount} + 1` })
    .where(eq(navLinks.id, id))
  return { ok: true }
})