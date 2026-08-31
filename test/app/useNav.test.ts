import { describe, it, expect, vi } from 'vitest'
import { parseLogo, richTextToPlain, trackNavClick } from '../../app/composables/useNav'

// `$fetch` is compiled into module sources via Nuxt auto-import from `ofetch`,
// so we mock that module to intercept the fire-and-forget click tracking.
const { $fetch } = vi.hoisted(() => ({ $fetch: vi.fn() }))
vi.mock('ofetch', () => ({ $fetch, default: $fetch }))

describe('parseLogo', () => {
  it('returns none for null/undefined/empty', () => {
    expect(parseLogo(null)).toEqual({ kind: 'none' })
    expect(parseLogo(undefined)).toEqual({ kind: 'none' })
    expect(parseLogo('')).toEqual({ kind: 'none' })
  })

  it('detects inline SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
    expect(parseLogo(svg)).toEqual({ kind: 'svg', src: svg })
  })

  it('detects Iconify class', () => {
    expect(parseLogo('i-lucide-globe')).toEqual({ kind: 'icon', src: 'i-lucide-globe' })
    expect(parseLogo('i-simple-icons-github')).toEqual({ kind: 'icon', src: 'i-simple-icons-github' })
  })

  it('detects URL strings', () => {
    expect(parseLogo('https://example.com/logo.png')).toEqual({ kind: 'url', src: 'https://example.com/logo.png' })
    expect(parseLogo('/api/files/serve/abc123/logo.webp')).toEqual({ kind: 'url', src: '/api/files/serve/abc123/logo.webp' })
    expect(parseLogo('data:image/png;base64,abc')).toEqual({ kind: 'url', src: 'data:image/png;base64,abc' })
  })

  it('returns none for unparseable strings', () => {
    expect(parseLogo('random text')).toEqual({ kind: 'none' })
    expect(parseLogo('  spaced text  ')).toEqual({ kind: 'none' })
  })
})

describe('richTextToPlain', () => {
  it('returns empty string for falsy / non-object input', () => {
    expect(richTextToPlain(null)).toBe('')
    expect(richTextToPlain(undefined)).toBe('')
    expect(richTextToPlain('a string')).toBe('')
    expect(richTextToPlain({})).toBe('')
  })

  it('extracts text from a flat document', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'World' }] }
      ]
    }
    expect(richTextToPlain(doc)).toBe('Hello World')
  })

  it('walks nested nodes and ignores non-text nodes', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }
          ]
        }
      ]
    }
    expect(richTextToPlain(doc)).toBe('Title A')
  })

  it('collects text across multiple marked text nodes', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'The ' },
            { type: 'text', text: 'quick', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' fox' }
          ]
        }
      ]
    }
    expect(richTextToPlain(doc)).toBe('The  quick  fox')
  })
})

describe('trackNavClick', () => {
  beforeEach(() => {
    $fetch.mockReset()
  })

  it('posts the link id to the click endpoint (fire-and-forget)', async () => {
    $fetch.mockResolvedValue({ ok: true })
    trackNavClick(42)
    await Promise.resolve()
    expect($fetch).toHaveBeenCalledWith('/api/nav/links/click', { method: 'POST', body: { id: 42 } })
  })

  it('never throws when the request fails', async () => {
    $fetch.mockRejectedValue(new Error('network down'))
    expect(() => trackNavClick(1)).not.toThrow()
    await Promise.resolve()
  })
})