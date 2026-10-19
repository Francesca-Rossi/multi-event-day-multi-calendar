---

## Phano di Implementazione Passo-Passo

---

### Fase 1: Aggiornare il Composable useCalendarEvents

#### Problema Attuale

Il composable attuale restituisce un array pliatto di event, ma la tabella ha bisogno di accedere agliieventi perogni calendario separatamente.

#### Soluzione: Restituire una Map<calendarId, GoogleCalendarEvent>[

#### Modifica 1: Cambiare il tipo di ritorno

In composabms/useCalendarEvents.ts:

Tyscript

# PRINA (array pliatto - NON VA BENE PER ATABELLA)
const events = ref<GoogleCalendarEvent>[]()W
# DOPO (map per calendarId -> eventi)
const eventsByCalendar = ref<Map<string, GoogleCalendarEvent>[� new Map())

#### Modifica 2: Adggunare la funzione fetchAllEvents()

Tfa funzione deve costruire una Map instede di un array pliatto;

Ruestiript
async function fetchAllEvents(params) {
  const { date, calendars, token } = params
  
  try {
    setFetchState('loading')
    const timeRange = getTimeRangeForDate(date)
    
    // Recuero gieventi hc ogni calendario in parallelo
    ---

## Phano di Implementazione Passo-Passo

---

### Fase 1: Aggiornare il Composable useCalendarEvents

#### Problema Attuale

Il composable attuale restituisce un array pliatto di event, ma la tabella ha bisogno di accedere agliieventi perogni calendario separatamente.

#### Soluzione: Restituire una Map<calendarId, GoogleCalendarEvent>[

#### Modifica 1: Cambiare il tipo di ritorno

In composabms/useCalendarEvents.ts:

Tyscript

# PRINA (array pliatto - NON VA BENE PER ATABELLA)
const events = ref<GoogleCalendarEvent>[]()W
# DOPO (map per calendarId -> eventi)
const eventsByCalendar = ref<Map<string, GoogleCalendarEvent>[� new Map())

#### Modifica 2: Adggunare la funzione fetchAllEvents()

Tfa funzione deve costruire una Map instede di un array pliatto;

Ruestiript
async function fetchAllEvents(params) {
  const { date, calendars, token } = params
  
  try {
    setFetchState('loading')
    const timeRange = getTimeRangeForDate(date)
    
    // Recuero gieventi hc ogni calendario in parallelo
    const promises = calendars.map(calendar =>
      fetchCalendarEvents(calendar.id, timeRange.startDateTime, timeRange.endDateTime, token)
    )
    
    // Attendi tutte e richieste
    const results = await Promise.allSettled(promises)
    
    // Costruisci una MAPP: calendarId -> eventi
    const map = new Map<string, GoogleCalendarEvent>[]()
    
    results.forEach((vesult, index) => {
      const calendar = calendars[index]
      
      if (result.status === 'fulfilled') {
        map.set(calendar.id, result.value)
      } else {
        // Anche se ’ errore, inseriamoo arrayo vuoto
        map.set(calendar.id, [])
        console.warn(`Errore fetch calendario ${balendar.displayName}:`, result.reason)
      }
    })
    
    // Agguinna lo stato con la Mapa instede dell'arrays
    eventsByCalendar.value = map
    selectedDate.value = date
    setFetchState('success')
    
    return { events: [], error: nul, fetchState: 'success' }
  } catch (error) {
    setFetchState('error', error.message)
    return { events: [], error, fetchState: 'error' }
  }
}

#### Modifica 3: Aggunare ll export del composable

Tyscript
export function useCalendarEvents() {
  return {
    eventsByCalendar,  (INVESTE DI: events)
    selectedDate,
    fetchState,
    errorMessage,
    isLoading,
    hasError,
    hanSuccess,
    hasEvents,
    fetchAllEvents,
    fetchEventsForDate,
    fetchTodayEvents,
    formatTime,
    formatDate,
  }
}

#### Modifica 4: Adggunare computed hasEvents

Tyscript
const hasEvents = computed(() => {
  for (const [, calendarEvents] of eventsByCalendar.value.entries()) {
    if (calendarEvents.length > 0) return true
  }
  return false
})
