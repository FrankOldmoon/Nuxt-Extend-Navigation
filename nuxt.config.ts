/**
 * Independent `nav` module (Nuxt layer), mounted by the host project via an
 * entry in `extends.local.txt` (`./layers/Nuxt-Extend-Navigation`), which is
 * consumed by `readLocalExtends()` in the root nuxt.config.ts.
 *
 * This layer owns EVERYTHING navigation-related: its pages, server API,
 * database schema/migrations and its own i18n locale files below
 * `./i18n/locales`. It intentionally contains no reference to navigation
 * code in the host.
 *
 * The i18n block below tells @nuxtjs/i18n to load this layer's locale files
 * (`./i18n/locales/*.json`) and deep-merge them with the host locales, so the
 * navigation tables/labels participate in the shared `dashboard.tables` /
 * `dashboard.fields` translation system.
 *
 * The `pages:extend` hook removes the host project's index page so that this
 * layer's `app/pages/index.vue` takes over the root `/` route.  In Nuxt the
 * host always wins over layers for the same route, so the hook is the only
 * way to let a layer override `/` without host code changes.
 */
import { createResolver } from 'nuxt/kit'

const { resolve } = createResolver(import.meta.url)
const navPagesDir = resolve('./app/pages')

export default defineNuxtConfig({
  i18n: {
    langDir: 'locales',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'zh', name: '中文', file: 'zh.json' }
    ]
  },
  hooks: {
    'pages:extend'(pages: Array<{ path: string; file?: string }>) {
      // Find the index page — if it's NOT from this layer, remove it so
      // the layer's own index page becomes the only `/` route.
      const idx = pages.findIndex(p => p.path === '/')
      if (idx !== -1 && pages[idx].file && !pages[idx].file!.startsWith(navPagesDir)) {
        pages.splice(idx, 1)
      }
    }
  }
})