export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: {
        lang: 'it'
      }
    }
  },

  css: ['~/assets/css/tailwind.css'],

  future: {
    compatibilityVersion: 4
  },

  runtimeConfig: {
    public: {
      // Le chiavi pubbliche sono accessibili sia client che server
      googleClientId: '', // Mappa in automatico NUXT_PUBLIC_GOOGLE_CLIENT_ID
    },
  },

  modules: ['@nuxt/ui'],

  ssr: false
})