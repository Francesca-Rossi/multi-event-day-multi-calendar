<script setup lang="ts">
import CalendarTable from '~/components/CalendarTable.vue'

// Usa i composables per accedere a calendari, autenticazione e eventi
const { calendars } = useCalendarConfig()
const { accessToken, isAuthenticated, signIn } = useGoogleAuth()
const { eventsByCalendar, errors, isLoading, hasError, errorMessage, fetchEventsForDate, formatDate } = useCalendarEvents()

/**
 * Data attualmente selezionata nella dashboard (default: oggi)
 * Usati per la navigazione tra i giorni
 */
const selectedDate = ref<Date>(new Date())

// ----------------------------------------------------------------------------
// Vincoli del range di date (secondo PLAN.md):
// - nessuna data nel passato
// - nessuna data oltre 1 anno nel futuro
// ----------------------------------------------------------------------------

const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)

const maxDate = new Date(todayStart)
maxDate.setFullYear(maxDate.getFullYear() + 1)

const canGoPrev = computed(() => selectedDate.value > todayStart)
const canGoNext = computed(() => selectedDate.value < maxDate)
const isToday = computed(() => toDateInputValue(selectedDate.value) === toDateInputValue(todayStart))

/**
 * Formatta una data nel formato richiesto da <input type="date"> (YYYY-MM-DD)
 */
const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formatta una data nel formato italiano GG/MM/AAAA per la visualizzazione
 */
const formatDateDDMMYYYY = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

const nativeDateInputRef = ref<HTMLInputElement | null>(null)

/**
 * Apre il picker nativo cliccando sull'input nascosto
 */
const openNativePicker = () => {
  nativeDateInputRef.value?.showPicker?.()
}

/**
 * Computed bidirezionale per collegare l'input date alla data selezionata
 */
const dateInputValue = computed({
  get: () => toDateInputValue(selectedDate.value),
  set: (value: string) => {
    if (!value) return
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    selectDate(date)
  },
})

/**
 * Imposta la data selezionata clippandola nel range [todayStart, maxDate]
 */
const selectDate = (date: Date) => {
  date.setHours(0, 0, 0, 0)
  if (date < todayStart) date = new Date(todayStart)
  if (date > maxDate) date = new Date(maxDate)
  selectedDate.value = date
}

/**
 * Sposta la data selezionata di `days` giorni (clippata nel range valido)
 */
const shiftDate = (days: number) => {
  const next = new Date(selectedDate.value)
  next.setDate(next.getDate() + days)
  selectDate(next)
}

// ----------------------------------------------------------------------------
// Fetch eventi
// ----------------------------------------------------------------------------

/**
 * Carica gli eventi per la data attualmente selezionata
 */
const loadEvents = async () => {
  if (!isAuthenticated.value || !accessToken.value) return
  await fetchEventsForDate(selectedDate.value, calendars.value, accessToken.value)
}

/**
 * Watch per rilevare quando l'utente si autentica o il token cambia
 * Quando diventano disponibili, carica automaticamente gli eventi della data selezionata
 */
watch([isAuthenticated, accessToken], async ([authOk, token]) => {
  if (authOk && token) {
    console.log('Utente autenticato, caricamento eventi...')
    await fetchEventsForDate(selectedDate.value, calendars.value, token)
  }
})

/**
 * Watch sulla data selezionata: ad ogni cambio data ricarica gli eventi
 */
watch(selectedDate, async () => {
  await loadEvents()
})

/**
 * Carica gli eventi al montaggio della pagina se già autenticati
 * Questo gestisce il caso in cui l\'utente era già loggato prima di aprire la dashboard
 */
onMounted(async () => {
  console.log('Dashboard montata, stato autenticazione:', isAuthenticated.value)

  if (isAuthenticated.value && accessToken.value) {
    console.log('Già autenticato, caricamento eventi...')
    await loadEvents()
  } else {
    console.log('Non autenticato, mostrando pulsante login')
  }
})

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
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- HEADER -->
    <header class="bg-white shadow-sm border-b p-4 sticky top-0 z-30">
      <div class="max-w-full mx-auto flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-bold text-gray-900">
          Dashboard - {{ formatDate(selectedDate) }}
          <span
            v-if="isToday"
            class="ml-2 inline-block align-middle text-xs font-medium text-white bg-green-600 rounded-full px-2 py-1"
          >Oggi</span>
        </h1>

        <!-- Navigazione data -->
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            title="Giorno precedente"
            :disabled="!canGoPrev"
            @click="shiftDate(-1)"
          >
            ←
          </button>

          <button
            type="button"
            class="relative overflow-hidden px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium border-0 cursor-pointer"
            title="Seleziona una data"
            @click="openNativePicker"
          >
            <input
              id="date-input"
              ref="nativeDateInputRef"
              v-model="dateInputValue"
              type="date"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              :min="toDateInputValue(todayStart)"
              :max="toDateInputValue(maxDate)"
            />
            <span>{{ formatDateDDMMYYYY(selectedDate) }}</span>
          </button>

          <button
            class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            title="Giorno successivo"
            :disabled="!canGoNext"
            @click="shiftDate(1)"
          >
            →
          </button>

          <button
            class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isToday"
            @click="selectDate(new Date())"
          >
            Oggi
          </button>

          <NuxtLink
            to="/settings"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <span>Impostazioni</span>
            <span class="text-xl">⚙️</span>
          </NuxtLink>
        </div>
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