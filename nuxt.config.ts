// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Configurazione Tailwind CSS
  css: ['~/assets/css/tailwind.css'],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "tailwindcss/base";@use "tailwindcss/components";@use "tailwindcss/utilities";`
        }
      }
    }
  },

  // Plugin Vite per Tailwind CSS (Nuxt 3.9+)
  future: {
    compatibilityVersion: 4
  },

  // Configurazione variabili d'ambiente
  runtimeConfig: {
    public: {
      googleClientId: '' // Inserisci qui il tuo Client ID OAuth2 di Google
    }
  },

  // Disabilita SSR per evitare problemi con le chiamate OAuth2 lato client
  ssr: false
})
