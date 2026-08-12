export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  css: ['~/assets/css/tailwind.css'],

  future: {
    compatibilityVersion: 4
  },

  runtimeConfig: {
    public: {
      googleClientId: ''
    }
  },

  modules: ['@nuxt/ui'],

  ssr: false
})