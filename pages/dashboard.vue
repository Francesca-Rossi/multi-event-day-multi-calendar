<script setup lang="ts">
import CalendarTable from '~/components/CalendarTable.vue'

// Usa i composables per accedere a calendari, autenticazione e eventi
const { calendars } = useCalendarConfig()
const { accessToken, isAuthenticated, signIn } = useGoogleAuth()
const { eventsByCalendar, errors, isLoading, hasError, errorMessage, fetchTodayEvents, formatDate } = useCalendarEvents()

/**
 * Gestisce il login con Google OAuth2
 */
const handleSignIn = async () => {
  try {
    await signIn()
  } catch (error) {
    console.error('Errore durante l\'autenticazione:', error)
  }
}

/**
 * Watch per rilevare quando l'utente si autentica o il token cambia
 * Quando diventano disponibili, carica automaticamente gli eventi
 */
watch([isAuthenticated, accessToken], async ([authOk, token]) => {
  if (authOk && token) {
    console.log('Utente autenticato, caricamento eventi...')
    await fetchTodayEvents(calendars.value, token)
  }
})

/**
 * Carica gli eventi al montaggio della pagina se già autenticati
 * Questo gestisce il caso in cui l\'utente era già loggato prima di aprire la dashboard
 */
onMounted(async () => {
  console.log('Dashboard montata, stato autenticazione:', isAuthenticated.value)
  
  if (isAuthenticated.value && accessToken.value) {
    console.log('Già autenticato, caricamento eventi...')
    await fetchTodayEvents(calendars.value, accessToken.value)
  } else {
    console.log('Non autenticato, mostrando pulsante login')
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- HEADER -->
    <header class="bg-white shadow-sm border-b p-4 sticky top-0 z-30">
      <div class="max-w-full mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">
          Dashboard - {{ formatDate(new Date()) }}
        </h1>
        <NuxtLink
          to="/settings"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
        >
          <span>Impostazioni</span>
          <span class="text-xl">⚙️</span>
        </NuxtLink>
      </div>
    </header>
    
    <!-- MAIN CONTENT -->
    <main class="max-w-full mx-auto px-4 py-6">
      <!-- Messaggio per utenti non autenticati -->
      <div v-if="!isAuthenticated" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p class="text-blue-800 font-medium">Devi accedere per visualizzare gli eventi del calendario</p>
        <button
          @click="handleSignIn"
          class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Accedi con Google
        </button>
      </div>
      
      <!-- Tabella Oraria -->
      <CalendarTable
        :calendars="calendars"
        :events-by-calendar="eventsByCalendar"
        :errors="errors"
        :is-loading="isLoading"
        :error-message="hasError ? errorMessage : undefined"
      />
    </main>
  </div>
</template>

<style scoped>
/* Stili opzionali aggiuntivi */
header {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
