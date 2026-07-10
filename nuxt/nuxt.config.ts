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
    '@nuxtjs/i18n',
    '@nuxtjs/supabase'
  ],

  supabase: {
    // @nuxtjs/supabase reads these from env by default (SUPABASE_URL / SUPABASE_KEY /
    // SUPABASE_SERVICE_KEY). We use the new-format names, so map explicitly.
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY,
    serviceKey: process.env.SUPABASE_SECRET_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/confirm']
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  },

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
    // Bleibt bis Phase C (Express → Nitro Migration) abgeschlossen ist.
    apiBase: process.env.NUXT_API_BASE_INTERNAL || 'http://localhost:3001/api',

    // Supabase — server-side only. Secret key darf NIE in den Client.
    // Vercel setzt beide über die Environment-Variables-UI.
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',

    // GPC.EU Customer API — reverse-proxy config. Siehe nuxt/server/utils/gpceu*.
    // Server-only, weil die Credentials nie zum Browser kommen dürfen.
    gpceu: {
      baseUrl: process.env.GPCEU_BASE_URL || '',
      apiKey: process.env.GPCEU_API_KEY || process.env.GUENTNER_API_KEY || '',
      jwt: process.env.GPCEU_JWT || '',
      email: process.env.GPCEU_EMAIL || '',
      password: process.env.GPCEU_PASSWORD || '',
      loginUrl: process.env.GPCEU_LOGIN_URL || '',
      timeoutMs: parseInt(process.env.GPCEU_TIMEOUT_MS || '30000', 10),
      pathPrefix: process.env.GPCEU_PATH_PREFIX ?? 'api/GPCDataQuery',
      healthPath: process.env.GPCEU_HEALTH_PATH || '',
      mock: process.env.GPCEU_MOCK === '1'
    },

    // DMS d.velop d.3one — Bearer-Auth, server-only.
    dms: {
      baseUrl: process.env.DMS_BASE_URL || 'https://dms-prod.guentner.com',
      repositoryId: process.env.DMS_REPOSITORY_ID || '',
      apiKey: process.env.DMS_API_KEY || '',
      authMode: (process.env.DMS_AUTH_MODE || 'bearer').toLowerCase(),
      propertySyntax: (process.env.DMS_PROPERTY_SYNTAX || 'bracket').toLowerCase()
    },

    // LLM providers (Anthropic Bella / Google Gemini). Provider-Wahl via LLM_PROVIDER.
    llm: {
      provider: (process.env.LLM_PROVIDER || 'anthropic').toLowerCase(),
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      googleApiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    },

    // Embeddings — OpenAI ist der einzige unterstützte Mode im Nitro-Port
    // (Vector-Store auf Supabase pgvector, Dimension 1536).
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiEmbeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',

    public: {
      // Im Browser sichtbar — relativ, läuft über Express auf gleicher Origin
      apiBase: '/api',
      // Supabase publishable key ist per Definition browser-safe (Row Level
      // Security schützt die Daten). Wird von @nuxtjs/supabase (Phase D) genutzt.
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || ''
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
    // Externalize native/complex Node modules — Rollup bundling of these breaks
    // on Windows (pdf-parse) and Vercel (native canvas bindings). Keeping them
    // as runtime CommonJS deps is safer and closer to how Vercel resolves.
    externals: {
      external: ['pdf-parse', 'xlsx', '@anthropic-ai/sdk', '@supabase/supabase-js']
    }
  }
});
