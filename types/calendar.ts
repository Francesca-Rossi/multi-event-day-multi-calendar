// Interfacce TypeScript per i tipi di dati relativi ai calendari Google

/**
 * Rappresenta una categoria (tag) per raggruppare i calendari
 * - id: identificativo univoco della categoria
 * - name: nome visualizzato della categoria
 */
export interface Category {
  id: string
  name: string
}

/**
 * Rappresenta un singolo calendario Google
 * - id: l'identificativo univoco del calendario (es. email per le risorse)
 * - displayName: il nome visualizzato dall'utente per questo calendario
 * - category: id della categoria assegnata (opzionale)
 */
export interface CalendarEntry {
  id: string
  displayName: string
  category?: string
}

/**
 * Configurazione completa dei calendari
 * Contiene la lista di tutti i calendari configurati dall'utente e le categorie
 */
export interface CalendarConfig {
  calendars: CalendarEntry[]
  categories: Category[]
}

/**
 * Rappresenta un evento singolo dal calendario Google
 * 
 * @property id - Identificativo univoco dell'evento
 * @property summary - Titolo/nome dell'evento
 * @property start - Data e ora di inizio (dateTime per eventi con orario, date per eventi whole-day)
 * @property end - Data e ora di fine (stessa logica di start)
 */
export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: { dateTime: string; date?: string }
  end: { dateTime: string; date?: string }
}
