/**
 * Nav module — i18n locale files + home page redirect.
 */
export default defineNuxtConfig({
  i18n: {
    langDir: 'locales',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'zh', name: '中文', file: 'zh.json' },
      { code: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' }
    ]
  }
})
