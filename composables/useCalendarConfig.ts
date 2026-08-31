// Composable per gestire la configurazione dei calendari
// Responsabilità: leggere e scrivere i calendari configurati in localStorage

import type { CalendarConfig, CalendarEntry } from '~/types/calendar'

// Chiave usata per salvare i dati in localStorage
const STORAGE_KEY = 'calendar_config'

/**
 * Composable che gestisce la configurazione dei calendari
 * 
 * Funzionalità:
 * - Legge i calendari da localStorage al momento dell'inizializzazione
 * - Permette di aggiungere, rimuovere e aggiornare calendari
 * - Fornisce una computed per verificare se ci sono calendari configurati
 * 
 * @returns Oggetto con le funzioni e i ref per gestire i calendari
 * 
 * Esempio d'uso:
 * ```typescript
 * const { calendars, addCalendar, removeCalendar, saveConfig } = useCalendarConfig()
 * addCalendar('room123@office.com', 'Sala 123')
 * removeCalendar('room123@office.com')
 * saveConfig()
 * ```
 */
export const useCalendarConfig = () => {
  // Ref per memorizzare l'elenco dei calendari
  // Inizializzato a un array vuoto, verrà popolato da localStorage
  const calendars = ref<CalendarEntry[]>([])

  /**
   * Legge la configurazione da localStorage
   * Gestisce i casi in cui localStorage è vuoto o i dati sono corrotti
   */
  const loadConfig = () => {
    try {
      // In un'applicazione Nuxt, usiamo useNuxtApp per accedere a useState
      // che gestisce correttamente il server/client side rendering
      const stored = localStorage.getItem(STORAGE_KEY)
      
      if (stored) {
        // Parse dei dati salvati
        const config: CalendarConfig = JSON.parse(stored)
        
        // Validazione: assicuriamoci che calendars esista e sia un array
        if (Array.isArray(config.calendars)) {
          calendars.value = config.calendars
        } else {
          // Se la struttura è corrotta, resetta a array vuoto
          calendars.value = []
        }
      }
    } catch (error) {
      // Se c'è un errore (JSON corrotto, localStorage non disponibile, ecc.)
      // Impostiamo un array vuoto e mostriamo un errore in console
      console.error('Errore nel caricamento della configurazione:', error)
      calendars.value = []
    }
  }

  /**
   * Salva la configurazione attuale in localStorage
   * Serializza l'array di calendari in formato JSON
   */
  const saveConfig = () => {
    try {
      const config: CalendarConfig = {
        calendars: calendars.value
      }
      
      // Stringifica e salva in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      
      // Log per debug (rimuovibile in produzione)
      console.log('Configurazione salvata:', config)
    } catch (error) {
      console.error('Errore nel salvataggio della configurazione:', error)
    }
  }

  /**
   * Aggiunge un nuovo calendario alla lista
   * 
   * @param id - L'ID univoco del calendario (es. email della risorsa)
   * @param displayName - Il nome da mostrare all'utente (opzionale)
   * 
   * Esempio:
   * addCalendar('c_abc123@resource.calendar.google.com', 'Sala Conferenze')
   */
  const addCalendar = (id: string, displayName?: string) => {
    // Normalizza l'ID: rimuovi spazi extra e assicurati che non sia vuoto
    const normalizedId = id.trim()
    
    if (!normalizedId) {
      console.warn('Impossibile aggiungere calendario: ID vuoto')
      return
    }
    
    // Se displayName non è fornito, usa l'ID stesso
    const name = displayName?.trim() || normalizedId
    
    // Crea il nuovo calendario
    const newCalendar: CalendarEntry = {
      id: normalizedId,
      displayName: name
    }
    
    // Controlla se il calendario esiste già
    const exists = calendars.value.some(cal => cal.id === normalizedId)
    if (exists) {
      console.warn(`Calendario con ID ${normalizedId} esiste già`)
      return
    }
    
    // Aggiungi alla lista
    calendars.value.push(newCalendar)
    
    // Salva automaticamente le modifiche
    saveConfig()
  }

  /**
   * Rimuove un calendario dalla lista
   * 
   * @param id - L'ID del calendario da rimuovere
   * 
   * Esempio:
   * removeCalendar('c_abc123@resource.calendar.google.com')
   */
  const removeCalendar = (id: string) => {
    const normalizedId = id.trim()
    
    if (!normalizedId) {
      console.warn('Impossibile rimuovere calendario: ID vuoto')
      return
    }
    
    // Filtra il calendario rimosso
    calendars.value = calendars.value.filter(cal => cal.id !== normalizedId)
    
    // Salva le modifiche
    saveConfig()
  }

  /**
   * Aggiorna il nome visualizzato di un calendario
   * 
   * @param id - L'ID del calendario da aggiornare
   * @param name - Il nuovo nome da mostrare
   * 
   * Esempio:
   * updateDisplayName('c_abc123@resource.calendar.google.com', 'Nuovo Nome')
   */
  const updateDisplayName = (id: string, name: string) => {
    const normalizedId = id.trim()
    
    if (!normalizedId) {
      console.warn('Impossibile aggiornare: ID vuoto')
      return
    }
    
    // Trova il calendario e aggiorna il nome
    const calendar = calendars.value.find(cal => cal.id === normalizedId)
    
    if (!calendar) {
      console.warn(`Calendario con ID ${normalizedId} non trovato`)
      return
    }
    
    // Aggiorna il nome (normalizza gli spazi)
    calendar.displayName = name.trim()
    
    // Salva le modifiche
    saveConfig()
  }

  /**
   * Sposta un calendario in alto nella lista (verso l'indice 0)
   * 
   * @param id - L'ID del calendario da spostare
   * 
   * Esempio:
   * moveCalendarUp('c_abc123@resource.calendar.google.com')
   */
  const moveCalendarUp = (id: string) => {
    const normalizedId = id.trim()
    const index = calendars.value.findIndex(cal => cal.id === normalizedId)
    
    if (index <= 0) {
      // Il calendario non esiste o è già in prima posizione
      return
    }
    
    // Scambia con l'elemento precedente
    const temp = calendars.value[index - 1]!
    calendars.value[index - 1] = calendars.value[index]!
    calendars.value[index] = temp
    
    // Salva le modifiche
    saveConfig()
  }

  /**
   * Sposta un calendario in basso nella lista
   * 
   * @param id - L'ID del calendario da spostare
   * 
   * Esempio:
   * moveCalendarDown('c_abc123@resource.calendar.google.com')
   */
  const moveCalendarDown = (id: string) => {
    const normalizedId = id.trim()
    const index = calendars.value.findIndex(cal => cal.id === normalizedId)
    
    if (index < 0 || index >= calendars.value.length - 1) {
      // Il calendario non esiste o è già in ultima posizione
      return
    }
    
    // Scambia con l'elemento successivo
    const temp = calendars.value[index + 1]!
    calendars.value[index + 1] = calendars.value[index]!
    calendars.value[index] = temp
    
    // Salva le modifiche
    saveConfig()
  }

  /**
   * Computed che restituisce true se ci sono calendari configurati
   * Utile per abilitare/disabilitare bottoni o mostrare contenuti condizionali
   */
  const hasCalendars = computed(() => {
    return calendars.value.length > 0
  })

  // Carica la configurazione all'inizializzazione del composable
  // In Nuxt 3, onNuxtReady viene eseguito dopo il mount dell'app
  if (import.meta.client) {
    loadConfig()
  }

  // Espone tutte le funzioni e le computed necessarie
  return {
    calendars,
    addCalendar,
    removeCalendar,
    updateDisplayName,
    moveCalendarUp,
    moveCalendarDown,
    saveConfig,
    hasCalendars
  }
}
