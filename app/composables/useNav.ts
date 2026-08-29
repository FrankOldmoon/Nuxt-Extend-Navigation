/**
 * Navigation module — front-end data access + formatting helpers.
 *
 * `useNavData()` SSR-fetches the category groups (categories + their active
 * links) from the module's own API and exposes a flattened, grouped list.
 *
 * `parseLogo()` turns a stored `logo` value (URL / Iconify class / inline SVG)
 * into a descriptor the template can render for `<img>`, `<UIcon>` or raw HTML.
 */
import type { NavLink, NavCategory } from '../../server/database/schema'

export interface NavLinkView extends Omit<NavLink, 'tags'> {
  tags: string[]
}
export interface NavCategoryGroup {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  links: NavLinkView[]
}

/** Normalise a stored `logo` value into a render descriptor. */
export function parseLogo(logo: string | null | undefined): { kind: 'url' | 'icon' | 'svg' | 'none'; src?: string } {
  if (!logo) return { kind: 'none' }
  const s = logo.trim()
  if (s.startsWith('<svg')) return { kind: 'svg', src: s }
  if (s.startsWith('i-')) return { kind: 'icon', src: s }
  if (/^https?:\/\//i.test(s) || s.startsWith('/') || s.startsWith('data:')) return { kind: 'url', src: s }
  return { kind: 'none' }
}

/** Hydrate a raw API group row into a NavCategoryGroup. */
function hydrate(group: NavCategoryGroup): NavCategoryGroup {
  return {
    ...group,
    links: group.links.map(l => ({ ...l, tags: Array.isArray(l.tags) ? l.tags : [] }))
  }
}

/** Fetch all active categories + their active links from the module API. */
export function useNavData() {
  return useAsyncData<NavCategoryGroup[]>('nav-groups', async () => {
    const raw = await $fetch<NavCategoryGroup[]>('/api/nav/overview')
    return raw.map(hydrate)
  }, { default: () => [] })
}

/** Increment the click counter for a link (fire-and-forget). */
export function trackNavClick(id: number) {
  try {
    void $fetch('/api/nav/links/click', {
      method: 'POST',
      body: { id }
    })
  } catch {
    /* ignore — counting is best-effort */
  }
}

export type { NavLink, NavCategory }