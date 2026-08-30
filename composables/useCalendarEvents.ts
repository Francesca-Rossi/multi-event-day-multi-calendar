/**
 * Composable per gestire il fetch degli eventi dai calendari Google
 * 
 * Questo composable gestisce:
 * - Recupero degli eventi da più calendari
 * - Filtraggio degli eventi per data
 * - Ordinamento degli eventi per orario
 * - Gestione degli errori di rete
 * - Formattazione degli orari
 * 
 * @author Cesco
 * @version 1.0.0
 * @since 1.0.0
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { ref, computed } from 'vue'
import type { CalendarEntry, GoogleCalendarEvent } from '~/types/calendar'

// ============================================================================
// TIPI E INTERFACCIE
// ============================================================================

/**
 * Stato delle operazioni di fetch
 * 
 * @property 'idle' - Nessun fetch in corso
 * @property 'loading' - Recupero eventi in corso
 * @property 'success' - Eventi recuperati con successo
 * @property 'error' - Si è verificato un errore
 */
type FetchState = 'idle' | 'loading' | 'success' | 'error'

/**
 * Parametri per il fetch degli eventi
 * 
 * @property date - La data per cui recuperare gli eventi
 * @property calendars - Lista di calendari da interrogare
 * @property token - Token di accesso OAuth2
 */
interface FetchEventsParams {
  date: Date
  calendars: CalendarEntry[]
  token: string
}

/**
 * Risultato del fetch degli eventi
 * 
 * @property events - Lista di eventi filtrati e ordinati
 * @property error - Messaggio di errore (se presente)
 * @property fetchState - Stato corrente del fetch
 */
interface FetchResult {
  events: GoogleCalendarEvent[]
  error: string | null
  fetchState: FetchState
}

// ============================================================================
// COSTANTI
// ============================================================================

/**
 * Chiave per identificare il composable
 * Usata per debugging e logging
 */
const COMPOSABLE_NAME = 'useCalendarEvents'

/**
 * Formato data richiesto dall'API di Google
 * Esempio: 2024-01-15T00:00:00Z
 */
const GOOGLE_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ'

/**
 * Intervallo di minuti da considerare prima e dopo la data selezionata
 * Utile per includere eventi che iniziano prima ma finiscono dopo mezzanotte
 */
const TIME_BUFFER_MINUTES = 60

/**
 * Timeout per le richieste API in millisecondi
 * Se la richiesta non risponde entro questo tempo, si considera un errore
 */
const API_TIMEOUT_MS = 30000 // 30 secondi

// ============================================================================
// STATO REATTIVO
// ============================================================================

/**
 * Mappa degli eventi per calendario
 * 
 * Struttura: Map<calendarId, GoogleCalendarEvent[]>
 * Utile per accedere rapidamente agli eventi di ogni calendario quando costruiamo la tabella oraria
 */
const eventsByCalendar = ref<Map<string, GoogleCalendarEvent[]>>(new Map())

/**
 * Data per cui sono stati recuperati gli eventi
 * 
 * Utile per sapere se gli eventi sono aggiornati
 * Se cambi la data, devi fare un nuovo fetch
 */
const selectedDate = ref<Date | null>(null)

/**
 * Stato corrente del fetch
 * 
 * Possibili valori:
 * - 'idle': Nessun fetch in corso, eventi non caricati
 * - 'loading': Sto recuperando gli eventi dalle API
 * - 'success': Eventi recuperati con successo
 * - 'error': Si è verificato un errore durante il fetch
 */
const fetchState = ref<FetchState>('idle')

/**
 * Messaggio di errore (se presente)
 * 
 * Utile per mostrare all'utente cosa è andato storto
 * Esempi: "Errore di rete", "Token scaduto", "Calendario non trovato"
 */
const errorMessage = ref<string>('')

/**
 * Mappa degli errori per calendario
 *
 * Struttura: Map<calendarId, string>
 * Contiene il messaggio di errore per ogni calendario che non è stato
 * possibile contattare (es. 403/404). Utile per mostrare un indicatore
 * nella colonna corrispondente senza bloccare il resto della tabella.
 */
const errors = ref<Map<string, string>>(new Map())

/**
 * Controlla se gli eventi sono stati caricati con successo
 * 
 * @returns true se fetchState è 'success', false altrimenti
 */
const isLoading = computed(() => {
  return fetchState.value === 'loading'
})

/**
 * Controlla se c'è stato un errore durante il fetch
 * 
 * @returns true se fetchState è 'error', false altrimenti
 */
const hasError = computed(() => {
  return fetchState.value === 'error'
})

/**
 * Controlla se gli eventi sono stati caricati con successo
 * 
 * @returns true se fetchState è 'success', false altrimenti
 */
const hasSuccess = computed(() => {
  return fetchState.value === 'success'
})

/**
 * Controlla se ci sono eventi da visualizzare
 * 
 * @returns true se almeno un calendario ha eventi, false altrimenti
 */
const hasEvents = computed(() => {
  for (const [, calendarEvents] of eventsByCalendar.value.entries()) {
    if (calendarEvents.length > 0) return true
  }
  return false
})

// ============================================================================
// FUNZIONI UTILI
// ============================================================================

/**
 * Imposta lo stato del fetch e gestisce gli errori
 * 
 * Questa funzione:
 * 1. Imposta lo stato desiderato
 * 2. Se lo stato è 'error', imposta il messaggio di errore
 * 
 * @param newState - Il nuovo stato da impostare
 * @param error - Messaggio di errore (usato solo se newState è 'error')
 * 
 * @example
 * setFetchState('error', 'Errore di rete')
 */
function setFetchState(newState: FetchState, error?: string): void {
  fetchState.value = newState
  if (newState === 'error' && error) {
    errorMessage.value = error
    console.error(`[${COMPOSABLE_NAME}]`, error)
  }
}

/**
 * Formatta una data nel formato richiesto dall'API di Google
 * 
 * L'API di Google richiede date nel formato ISO 8601:
 * Esempio: 2024-01-15T00:00:00Z
 * 
 * @param date - La data da formattare
 * @returns Stringa formattata nel formato richiesto da Google
 * 
 * @example
 * formatDateToGoogle(new Date('2024-01-15'))
 * // Restituisce: "2024-01-15T00:00:00+00:00"
 */
function formatDateToGoogle(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // Mesi da 0 a 11
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  // Ottieni il fuso orario in formato +00:00
  const timezoneOffset = date.getTimezoneOffset()
  const timezoneHours = Math.abs(Math.floor(timezoneOffset / 60))
  const timezoneMinutes = Math.abs(timezoneOffset % 60)
  const timezoneSign = timezoneOffset <= 0 ? '+' : '-'
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneSign}${String(timezoneHours).padStart(2, '0')}:${String(timezoneMinutes).padStart(2, '0')}`
}

/**
 * Calcola l'intervallo di tempo per il fetch degli eventi
 * 
 * Gli eventi possono iniziare prima e finire dopo la mezzanotte.
 * Per includere tutti gli eventi rilevanti, fetchiamo:
 * - Un'ora prima della mezzanotte
 * - Un'ora dopo la mezzanotte
 * 
 * @param date - La data selezionata
 * @returns Oggetto con startDateTime e endDateTime formattati
 */
function getTimeRangeForDate(date: Date): { startDateTime: string; endDateTime: string } {
  // Crea una copia della data
  const startDate = new Date(date)
  const endDate = new Date(date)
  
  // Imposta l'orario a mezzanotte
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)
  
  // Aggiungi buffer di un'ora prima e dopo
  startDate.setMinutes(startDate.getMinutes() - TIME_BUFFER_MINUTES)
  endDate.setMinutes(endDate.getMinutes() + TIME_BUFFER_MINUTES)
  
  return {
    startDateTime: formatDateToGoogle(startDate),
    endDateTime: formatDateToGoogle(endDate),
  }
}

/**
 * Chiama l'API di Google per recuperare gli eventi di un calendario
 * 
 * Questa funzione:
 * 1. Costruisce l'URL della richiesta
 * 2. Aggiungi le intestazioni HTTP (Authorization, Content-Type)
 * 3. Fa la richiesta GET all'API
 * 4. Restituisce gli eventi in formato JSON
 * 
 * @param calendarId - ID del calendario da interrogare
 * @param startDateTime - Data inizio intervallo
 * @param endDateTime - Data fine intervallo
 * @param token - Token di accesso OAuth2
 * @returns Promise con la lista di eventi
 * 
 * @example
 * const calendarId = 'primary'
 * const events = await fetchCalendarEvents(calendarId, start, end, token)
 */
async function fetchCalendarEvents(
  calendarId: string,
  startDateTime: string,
  endDateTime: string,
  token: string
): Promise<GoogleCalendarEvent[]> {
  // Costruisci l'URL dell'API
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`

  // Aggiungi i parametri di query
  const params = new URLSearchParams({
    timeMin: startDateTime,
    timeMax: endDateTime,
    singleEvents: 'true', // Espandi le ricorrenze
    orderBy: 'startTime', // Ordina per orario di inizio
    maxResults: '250', // Massimo eventi per richiesta
  })
  
  // Costruisci l'URL completo
  const fullUrl = `${url}?${params.toString()}`
  
  console.log(`[${COMPOSABLE_NAME}] Fetch eventi per calendario: ${calendarId}`)
  console.log(`[${COMPOSABLE_NAME}] Intervallo: ${startDateTime} - ${endDateTime}`)
  
  // Imposta il timeout per la richiesta
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  
  try {
    // Fai la richiesta GET all'API di Google
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    })
    
    // Rimuovi il timeout quando riceviamo la risposta
    clearTimeout(timeoutId)
    
    // Controlla se la richiesta è stata cancellata per timeout
    if (!response.ok && controller.signal.aborted) {
      throw new Error('Richiesta scaduta (timeout)')
    }
    
    // Controlla se la risposta è ok (status 200-299)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Errore API: ${response.status}`)
    }
    
    // Estrai i dati JSON dalla risposta
    const data = await response.json()
    
    // Estrai la lista di eventi
    const calendarEvents = data.items || []
    
    // Aggiungi l'ID del calendario a ogni evento
    const eventsWithCalendar = calendarEvents.map((event: GoogleCalendarEvent) => ({
      ...event,
      calendarId,
    }))
    
    console.log(`[${COMPOSABLE_NAME}] Calendario ${calendarId}: ${eventsWithCalendar.length} eventi trovati`)
    
    return eventsWithCalendar
  } catch (error) {
    console.error(`[${COMPOSABLE_NAME}] Errore fetch calendario ${calendarId}`, error)
    throw error
  }
}

/**
 * Risolve il valore di inizio/fine di un evento in un oggetto Date
 * 
 * Gestisce i due formati supportati dall'API di Google:
 * - dateTime: timestamp completo (es. "2026-08-29T09:00:00+02:00")
 * - date: solo data, eventi all-day (es. "2026-08-29"). Viene interpretata
 *   come mezzanotte SOLO dell'ora locale, altrimenti "new Date('YYYY-MM-DD')"
 *   la tratterebbe come mezzanotte UTC (00:00Z) che in Italia equivale alle
 *   02:00 locali, facendo "spostare" gli all-day fuori dal giorno corretto.
 * 
 * @param value - Stringa data/ora dell'evento
 * @returns Date corrispondente, oppure null se il valore è assente
 */
function parseEventDate(value: string | undefined): Date | null {
  if (!value) return null

  // Formato all-day: "YYYY-MM-DD" senza componente oraria
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

/**
 * Filtra e ordina gli eventi per la visualizzazione
 * 
 * Questa funzione:
 * 1. Mantiene gli eventi che intersecano il giorno selezionato
 *    (inclusi quelli già terminati e gli eventi all-day)
 * 2. Ordina gli eventi per orario di inizio
 * 3. Formatta gli orari per la visualizzazione
 * 4. Calcola la durata degli eventi
 * 
 * @param allEvents - Tutti gli eventi da un singolo calendario
 * @param currentDate - Il giorno di riferimento (si considerano solo gli eventi di quel giorno)
 * @returns Lista di eventi filtrati e ordinati
 */
function processEvents(allEvents: GoogleCalendarEvent[], currentDate: Date): GoogleCalendarEvent[] {
  console.log(`[${COMPOSABLE_NAME}] Elaborazione ${allEvents.length} eventi`)
  
  // Estremi del giorno selezionato (ora locale)
  const startOfDay = new Date(currentDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(currentDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Filtra gli eventi: mantieni quelli che intersecano il giorno selezionato.
  // Non si confronta con "adesso" per non nascondere gli eventi già terminati
  // ma comunque appartenenti al giorno visualizzato.
  const filteredEvents = allEvents.filter((event: GoogleCalendarEvent) => {
    const startTime = parseEventDate(event.start?.dateTime ?? event.start?.date)
    const endTime = parseEventDate(event.end?.dateTime ?? event.end?.date)

    if (!startTime || !endTime) {
      return false
    }

    // L'end di un all-day è la mezzanotte del giorno successivo (esclusiva),
    // quindi `endTime > startOfDay` lo mantiene nel giorno selezionato.
    return startTime <= endOfDay && endTime > startOfDay
  })
  
  // Ordina gli eventi per orario di inizio
  const sortedEvents = filteredEvents.sort((a: GoogleCalendarEvent, b: GoogleCalendarEvent) => {
    const timeA = parseEventDate(a.start?.dateTime ?? a.start?.date)?.getTime() ?? 0
    const timeB = parseEventDate(b.start?.dateTime ?? b.start?.date)?.getTime() ?? 0
    return timeA - timeB
  })
  
  console.log(`[${COMPOSABLE_NAME}] ${sortedEvents.length} eventi dopo il filtraggio`)
  
  return sortedEvents
}

/**
 * Formatta un'ora per la visualizzazione
 * 
 * @param dateTime - Data e ora da formattare
 * @returns Stringa formattata (es. "09:30")
 */
function formatTime(dateTime: string | undefined): string {
  if (!dateTime) return '--:--'
  
  const date = new Date(dateTime)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}

/**
 * Formatta la data per la visualizzazione
 * 
 * @param date - Data da formattare
 * @returns Stringa formattata (es. "Lunedì 15 Gennaio")
 */
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  
  return date.toLocaleDateString('it-IT', options)
}

// ============================================================================
// FUNZIONI PRINCIPALI
// ============================================================================

/**
 * Recupera gli eventi da tutti i calendari configurati
 * 
 * Questa funzione:
 * 1. Imposta lo stato di loading
 * 2. Fa una richiesta a ogni calendario
 * 3. Organizza gli eventi in una Map per calendarId
 * 4. Filtra e ordina gli eventi per ogni calendario
 * 5. Aggiorna lo stato con il risultato
 * 
 * @param params - Parametri per il fetch (data, calendari, token)
 * @returns Promise con il risultato del fetch
 * 
 * @example
 * const { events, error, fetchState } = await fetchAllEvents({
 *   date: new Date(),
 *   calendars: calendarList,
 *   token: accessToken
 * })
 */
async function fetchAllEvents(params: FetchEventsParams): Promise<FetchResult> {
  const { date, calendars, token } = params
  
  console.log(`[${COMPOSABLE_NAME}] Inizio fetch eventi per ${date.toLocaleDateString('it-IT')}`)
  
  try {
    // Imposta lo stato di loading
    setFetchState('loading')
    
    // Azzera gli errori del fetch precedente
    errors.value = new Map()
    
    // Calcola l'intervallo di tempo per il fetch
    const timeRange = getTimeRangeForDate(date)
    
    // Recupera gli eventi da ogni calendario in parallelo
    const promises = calendars.map((calendar: CalendarEntry) =>
      fetchCalendarEvents(calendar.id, timeRange.startDateTime, timeRange.endDateTime, token)
    )
    
    // Attendi tutte le richieste
    const results = await Promise.allSettled(promises)
    
    // Costruisci MAPPA degli eventi per calendarId
    const map = new Map<string, GoogleCalendarEvent[]>()
    
    results.forEach((result, index) => {
      const calendar = calendars[index]

      if (!calendar) {
      console.warn(`[${COMPOSABLE_NAME}] Calendario assente all'indice ${index}`)
      return
      }

      
      if (result.status === 'fulfilled') {
        // Elabora gli eventi (filtra e ordina)
        const processedEvents = processEvents(result.value, date)
        map.set(calendar.id, processedEvents)
      } else {
        console.warn(`[${COMPOSABLE_NAME}] Errore fetch calendario ${calendar.displayName}:`, result.reason)
        // Registra l'errore per questo calendario e imposta array vuoto
        errors.value.set(calendar.id, result.reason instanceof Error ? result.reason.message : 'Errore sconosciuto')
        map.set(calendar.id, [])
      }
    })
    
    // Aggiorna lo stato
    eventsByCalendar.value = map
    selectedDate.value = date
    setFetchState('success')
    
    console.log(`[${COMPOSABLE_NAME}] Fetch completato: ${map.size} calendari elaborati`)
    
    return {
      events: [],
      error: null,
      fetchState: 'success',
    }
  } catch (error) {
    console.error(`[${COMPOSABLE_NAME}] Errore fetch eventi`, error)
    
    // Imposta lo stato di errore
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto'
    setFetchState('error', errorMsg)
    
    return {
      events: [],
      error: errorMsg,
      fetchState: 'error',
    }
  }
}

/**
 * Recupera gli eventi per una data specifica
 * 
 * Questa è una funzione helper che:
 * 1. Controlla se l'utente è autenticato
 * 2. Verifica se ci sono calendari configurati
 * 3. Chiama fetchAllEvents con i parametri corretti
 * 
 * @param date - La data per cui recuperare gli eventi
 * @param calendars - Lista di calendari da interrogare
 * @param token - Token di accesso OAuth2
 * @returns Promise con il risultato del fetch
 * 
 * @example
 * await fetchEventsForDate(new Date(), calendars, token)
 */
export async function fetchEventsForDate(
  date: Date,
  calendars: CalendarEntry[],
  token: string
): Promise<FetchResult> {
  return fetchAllEvents({ date, calendars, token })
}

/**
 * Recupera gli eventi per la data odierna
 * 
 * Questa funzione è un comodità per recuperare gli eventi di oggi.
 * Usa la data corrente come parametro.
 * 
 * @param calendars - Lista di calendari da interrogare
 * @param token - Token di accesso OAuth2
 * @returns Promise con il risultato del fetch
 * 
 * @example
 * await fetchTodayEvents(calendars, token)
 */
export async function fetchTodayEvents(
  calendars: CalendarEntry[],
  token: string
): Promise<FetchResult> {
  return fetchAllEvents({
    date: new Date(),
    calendars,
    token,
  })
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Composable per gestire il fetch degli eventi dai calendari Google
 * 
 * @returns Oggetto con:
 * - eventsByCalendar: Map di eventi per calendarId
 * - selectedDate: Data per cui sono stati recuperati gli eventi
 * - fetchState: Stato corrente del fetch
 * - errorMessage: Messaggio di errore (se presente)
 * - isLoading: True se gli eventi sono in caricamento
 * - hasError: True se c'è stato un errore
 * - hasSuccess: True se gli eventi sono stati caricati con successo
 * - hasEvents: True se almeno un calendario ha eventi
 * - fetchAllEvents: Funzione per recuperare gli eventi
 * 
 * @example
 * // Usa il composable in un componente Vue
 * const { eventsByCalendar, isLoading, fetchAllEvents } = useCalendarEvents()
 * 
 * // Quando l'utente cambia la data
 * const handleDateChange = async (date: Date) => {
 *   const result = await fetchAllEvents({
 *     date,
 *     calendars: calendarList,
 *     token: accessToken
 *   })
 * }
 * 
 * // Mostra uno spinner durante il caricamento
 * // <div v-if="isLoading">Caricamento...</div>
 * 
 * // Mostra un messaggio di errore
 * // <div v-if="hasError" class="error">{{ errorMessage }}</div>
 * 
 * // Usa la tabella con eventiByCalendar
 * // <CalendarTable
 * //   :calendars="calendarList"
 * //   :events-by-calendar="eventsByCalendar"
 * // />
 */
export function useCalendarEvents() {
  return {
    // Stato
    eventsByCalendar,
    selectedDate,
    fetchState,
    errorMessage,
    errors,
    isLoading,
    hasError,
    hasSuccess,
    hasEvents,
    
    // Funzioni
    fetchAllEvents,
    fetchEventsForDate,
    fetchTodayEvents,
    
    // Funzioni utili
    formatTime,
    formatDate,
  }
}

