// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-15',
  devtools: { enabled: true },

  // SSR ist gesetzt (Phase-3-Entscheidung F1) — Daten werden serverseitig geholt
  // und ins Hydration-Payload geschrieben. Hydration übernimmt der Client.
  ssr: true,

  // Express auf :3001 proxied alle /app/*-Requests zu Nitro (:3002).
  // baseURL muss deshalb /app/ sein, damit Asset-Pfade in den Bundles stimmen.
  app: {
    baseURL: '/app/',
    head: {
      title: 'myGPC — Güntner Product Configurator',
      htmlAttrs: { lang: 'en' },
      meta: [{ charset: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/i18n'
  ],

  i18n: {
    // EN-only als MVP (Phase-3-Entscheidung F6). DE/FR kommen als reine
    // Datei-Adds in i18n/locales/, ohne Code-Refactor.
    // @nuxtjs/i18n v9 erwartet Locale-Dateien default unter i18n/locales/.
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' }
    ],
    lazy: true,
    bundle: {
      optimizeTranslationDirective: false
    }
  },

  runtimeConfig: {
    // Server-only — interner Loopback zum Express (für SSR-Calls auf /api/gpc-eu/*)
    apiBase: process.env.NUXT_API_BASE_INTERNAL || 'http://localhost:3001/api',
    public: {
      // Im Browser sichtbar — relativ, läuft über Express auf gleicher Origin
      apiBase: '/api'
    }
  },

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/components.css'
  ],

  // Pinia-Plugin für Persistence wird in plugins/pinia-persistedstate.client.ts geladen,
  // damit es nur clientseitig läuft (localStorage existiert serverseitig nicht).

  typescript: {
    strict: true,
    typeCheck: false  // im Dev-Loop off, vor PR via `npm run typecheck`
  },

  nitro: {
    // Production: separater Prozess (`node .output/server/index.mjs`).
    // Dev: nuxt dev mit eigenem Port 3002, kein devProxy nötig — server-side
    // API-Calls gehen direkt an runtimeConfig.apiBase, client-side an /api
    // über Express.
  }
});
