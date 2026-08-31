/**
 * Public — fetch a website's favicon and return a `logo` value suitable for the
 * nav `logo` field (an image URL the dashboard form can drop straight in).
 *
 * Strategy:
 *   1. Derive the origin from the given URL (POST { url }).
 *   2. Try to resolve a favicon at the well-known location(s) on that host.
 *   3. Fall back to Google's public favicon service for the hostname.
 *
 * The returned `logo` is always an https URL, so it renders as <img>.
 */
import { createError } from 'h3'
import { requireDashboardAccess } from '~~/server/utils/auth'
import { isHostnameBlocked } from '../../../utils/ssrfGuard'

const FALLBACK_FAVICON = (hostname: string, size = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`

export default defineEventHandler(async (event) => {
  // Only dashboard editors may resolve favicons (the fetched URL becomes a
  // navLink `logo`), and we never proxy arbitrary hosts for anonymous users.
  await requireDashboardAccess(event, 'navLinks', 'update')

  const body = await readBody<{ url?: string }>(event)
  const raw = String(body?.url ?? '').trim()
  if (!raw) throw createError({ statusCode: 400, statusMessage: 'url is required' })

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'invalid url' })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'only http(s) urls are supported' })
  }

  // SSRF guard: refuse loopback / link-local / private / reserved targets.
  if (await isHostnameBlocked(parsed.hostname)) {
    throw createError({ statusCode: 400, statusMessage: 'unsafe url' })
  }

  const origin = parsed.origin
  const hostname = parsed.hostname

  // Try common well-known favicon paths first.
  const candidates = [
    '/favicon.ico',
    '/favicon.png',
    '/apple-touch-icon.png',
    '/icon.png',
    '/_favicon.ico'
  ]

  // Lightweight reachability check via range/head-free GET with a short timeout.
  const timeoutMs = 4000
  for (const path of candidates) {
    try {
      const probe = await fetch(`${origin}${path}`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; Nuxt-Nav/1.0)' }
      })
      if (probe.ok && probe.headers.get('content-type')?.startsWith('image/')) {
        return { logo: `${origin}${path}`, source: 'origin' }
      }
    } catch {
      // try next candidate
    }
  }

  // Fallback: Google favicon service (always returns an image).
  return { logo: FALLBACK_FAVICON(hostname), source: 'fallback' }
})