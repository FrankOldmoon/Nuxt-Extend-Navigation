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
 */
export default defineNuxtConfig({
  i18n: {
    langDir: 'locales',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'zh', name: '中文', file: 'zh.json' }
    ]
  },
  routeRules: {
    '/': { redirect: '/nav' }
  }
})