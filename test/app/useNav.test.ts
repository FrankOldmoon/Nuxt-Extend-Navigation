import { describe, it, expect } from 'vitest'
import { parseLogo } from '../../app/composables/useNav'

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