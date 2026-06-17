/**
 * Composable per gestire l'autenticazione OAuth2 con Google
 * 
 * Questo composable gestisce:
 * - Caricamento dello script Google Identity Services (GSI)
 * - Inizializzazione del client OAuth2
 * - Autenticazione dell'utente
 * - Gestione del token di accesso
 * - Logout dell'utente
 * 
 * @author Cesco
 * @version 1.0.0
 * @since 1.0.0
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { ref, computed, onMounted } from 'vue'

// ============================================================================
// TIPI E INTERFACCIE
// ============================================================================

/**
 * Rappresenta lo stato dell'utente autenticato
 * 
 * @property token - Il token di accesso di Google (usato per le chiamate API)
 * @property profile - Le informazioni di base dell'utente (email, nome, foto)
 */
interface GoogleUser {
  token: string
  profile: {
    email: string
    name: string
    picture: string
  }
}

/**
 * Rappresenta lo stato dell'autenticazione
 * 
 * @property 'idle' - Iniziale, nessuna richiesta in corso
 * @property 'loading' - Caricamento dello script o inizializzazione
 * @property 'authenticated' - Utente autenticato con successo
 * @property 'error' - Si è verificato un errore
 */
type AuthState = 'idle' | 'loading' | 'authenticated' | 'error'

// ============================================================================
// COSTANTI
// ============================================================================

/**
 * Chiave per identificare il composable
 * Usata per debugging e logging
 */
const COMPOSABLE_NAME = 'useGoogleAuth'

/**
 * Client ID di Google OAuth2
 * 
 * IMPORTANTE: Questo valore viene caricato da nuxt.config.ts
 * Devi configurare NUXT_PUBLIC_GOOGLE_CLIENT_ID nelle variabili d'ambiente
 * 
 * Esempio:
 * NUXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
 */
const GOOGLE_CLIENT_ID = process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID

/**
 * Scope OAuth2 richiesti per leggere i calendari
 * 'openid' è necessario per il profilo utente
 * 'calendar' è necessario per leggere gli eventi
 */
const OAUTH_SCOPES = 'openid email calendar'

/**
 * URL dello script Google Identity Services (GSI)
 * Google fornisce questo script per gestire l'autenticazione OAuth2
 */
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

/**
 * Tempo massimo in millisecondi per il caricamento dello script GSI
 * Se lo script non si carica entro questo tempo, si considera un errore
 */
const GSI_SCRIPT_TIMEOUT = 10000 // 10 secondi

// ============================================================================
// STATO REATTIVO
// ============================================================================

/**
 * Stato corrente dell'autenticazione
 * 
 * Possibili valori:
 * - 'idle': Applicazione appena caricata, niente è stato fatto ancora
 * - 'loading': Lo script GSI si sta caricando o il client OAuth2 si sta inizializzando
 * - 'authenticated': Utente autenticato, abbiamo un token valido
 * - 'error': Si è verificato un errore (script non caricato, client ID mancante, ecc.)
 */
const authState = ref<AuthState>('idle')

/**
 * Informazioni sull'utente autenticato
 * 
 * Contiene:
 * - token: Il token di accesso che possiamo usare per chiamare le API di Google
 * - profile: Email, nome e foto dell'utente
 * 
 * Null se l'utente non è autenticato
 */
const user = ref<GoogleUser | null>(null)

/**
 * Messaggio di errore (se presente)
 * 
 * Utile per mostrare all'utente cosa è andato storto
 * Esempi: "Client ID non configurato", "Impossibile caricare script Google"
 */
const errorMessage = ref<string>('')

/**
 * Controlla se l'utente è autenticato
 * 
 * Computed property che restituisce true se:
 * - authState è 'authenticated'
 * - user non è null
 * 
 * @returns true se l'utente è autenticato, false altrimenti
 */
const isAuthenticated = computed(() => {
  return authState.value === 'authenticated' && user.value !== null
})

// ============================================================================
// FUNZIONI UTILI
// ============================================================================

/**
 * Imposta lo stato di autenticazione e gestisce gli errori
 * 
 * Questa funzione:
 * 1. Imposta lo stato desiderato
 * 2. Se lo stato è 'error', imposta il messaggio di errore
 * 
 * @param newState - Il nuovo stato da impostare
 * @param error - Messaggio di errore (usato solo se newState è 'error')
 * 
 * @example
 * setAuthState('error', 'Client ID non trovato')
 */
function setAuthState(newState: AuthState, error?: string): void {
  authState.value = newState
  if (newState === 'error' && error) {
    errorMessage.value = error
    console.error(`[${COMPOSABLE_NAME}]`, error)
  }
}

/**
 * Carica lo script Google Identity Services (GSI)
 * 
 * Lo script GSI è necessario per:
 * - Mostrare il pulsante "Accedi con Google"
 * - Gestire il flusso OAuth2
 * 
 * Questo script viene caricato dinamicamente perché:
 * - Non è necessario all'inizio
 * - Riduce il tempo di caricamento iniziale
 * - Viene caricato solo se serve
 * 
 * @returns Promise che si risolve quando lo script è caricato
 * @throws Error se lo script non si carica entro il timeout
 */
async function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Controlla se lo script è già caricato
    if ((window as any).google?.accounts) {
      console.log(`[${COMPOSABLE_NAME}] Script GSI già presente`)
      resolve()
      return
    }

    // Controlla se il Client ID è configurato
    if (!GOOGLE_CLIENT_ID) {
      console.error(`[${COMPOSABLE_NAME}] Client ID non configurato`)
      reject(new Error('Client ID non configurato'))
      return
    }

    // Crea un elemento script dinamico
    const script = document.createElement('script')
    script.src = GSI_SCRIPT_URL
    script.async = true
    script.defer = true

    // Quando lo script si carica con successo
    script.onload = (): void => {
      console.log(`[${COMPOSABLE_NAME}] Script GSI caricato con successo`)
      resolve()
    }

    // Quando si verifica un errore di caricamento
    script.onerror = (): void => {
      console.error(`[${COMPOSABLE_NAME}] Errore nel caricamento script GSI`)
      reject(new Error('Impossibile caricare script Google'))
    }

    // Aggiungi timeout per evitare che lo script rimanga bloccato
    const timeoutId = setTimeout(() => {
      console.error(`[${COMPOSABLE_NAME}] Timeout caricamento script GSI`)
      reject(new Error('Timeout caricamento script Google'))
    }, GSI_SCRIPT_TIMEOUT)

    // Quando lo script finisce di caricare, rimuovi il timeout
    script.onload = (): void => {
      clearTimeout(timeoutId)
      resolve()
    }

    // Aggiungi lo script al documento
    document.head.appendChild(script)
  })
}

/**
 * Inizializza il client OAuth2 di Google
 * 
 * Questa funzione:
 * 1. Crea un client OAuth2 usando il Client ID
 * 2. Configura le opzioni di autenticazione
 * 3. Imposta il callback per quando l'utente si autentica con successo
 * 
 * @returns Promise che si risolve quando il client è inizializzato
 */
async function initializeOAuthClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Controlla se lo script GSI è caricato
      if (!(window as any).google?.accounts) {
        console.error(`[${COMPOSABLE_NAME}] Script GSI non caricato`)
        reject(new Error('Script GSI non disponibile'))
        return
      }

      // Crea il client OAuth2
      // google.accounts.oauth2.initTokenClient crea un client per gestire i token
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: OAUTH_SCOPES,
        callback: handleOAuthResponse, // Callback quando l'utente si autentica
        error_callback: handleOAuthError, // Callback quando si verifica un errore
      })

      console.log(`[${COMPOSABLE_NAME}] Client OAuth2 inizializzato`)
      resolve()
    } catch (error) {
      console.error(`[${COMPOSABLE_NAME}] Errore inizializzazione client OAuth2`, error)
      reject(error)
    }
  })
}

/**
 * Gestisce la risposta dall'autenticazione OAuth2
 * 
 * Quando l'utente si autentica con successo, Google restituisce un token.
 * Questa funzione:
 * 1. Estrae il token dalla risposta
 * 2. Estrae le informazioni dell'utente dal token ID
 * 3. Salva le informazioni nello stato reattivo
 * 
 * @param response - La risposta di Google contenente il token
 */
function handleOAuthResponse(response: { access_token: string; id_token: string }): void {
  console.log(`[${COMPOSABLE_NAME}] Risposta OAuth2 ricevuta`, response)

  try {
    // Estrai il token di accesso (usato per le chiamate API)
    const accessToken = response.access_token

    // Decodifica l'ID token per ottenere le informazioni dell'utente
    // L'ID token è un JWT (JSON Web Token) che contiene informazioni sull'utente
    const idTokenPayload = decodeJwt(response.id_token)

    // Crea l'oggetto utente con le informazioni estratte
    user.value = {
      token: accessToken,
      profile: {
        email: idTokenPayload.email,
        name: idTokenPayload.name,
        picture: idTokenPayload.picture,
      },
    }

    // Imposta lo stato come autenticato
    setAuthState('authenticated')

    console.log(`[${COMPOSABLE_NAME}] Utente autenticato: ${user.value.profile.email}`)
  } catch (error) {
    console.error(`[${COMPOSABLE_NAME}] Errore elaborazione risposta OAuth2`, error)
    setAuthState('error', 'Errore nell\'elaborazione della risposta di autenticazione')
  }
}

/**
 * Gestisce gli errori dall'autenticazione OAuth2
 * 
 * Quando si verifica un errore (utente cancella, rifiuta il permesso, ecc.),
 * questa funzione viene chiamata per gestire l'errore in modo appropriato.
 * 
 * @param error - L'oggetto errore restituito da Google
 */
function handleOAuthError(error: { error?: string; error_description?: string }): void {
  console.warn(`[${COMPOSABLE_NAME}] Errore OAuth2`, error)

  // Estrai il messaggio di errore leggibile
  const errorMessage = error.error_description || error.error || 'Errore sconosciuto'

  // Imposta lo stato come errore con il messaggio
  setAuthState('error', errorMessage)
}

/**
 * Decodifica un JWT (JSON Web Token)
 * 
 * I token di Google sono JWT che hanno 3 parti:
 * 1. Header (algoritmo, tipo di token)
 * 2. Payload (dati: email, nome, foto, scadenza, ecc.)
 * 3. Signature (firma per verificare l'autenticità)
 * 
 * Le parti sono separate da punti (.) e encode in base64url.
 * Questa funzione decodifica solo il payload (parte 2).
 * 
 * @param token - Il token JWT da decodificare
 * @returns Oggetto con le informazioni del token
 */
function decodeJwt(token: string): {
  email?: string
  name?: string
  picture?: string
  email_verified?: boolean
  sub?: string
  iat?: number
  exp?: number
} {
  try {
    // Dividi il token nelle sue 3 parti
    const parts = token.split('.')

    // Se non ci sono 3 parti, il token è invalido
    if (parts.length !== 3) {
      throw new Error('Token JWT invalido: formato sbagliato')
    }

    // Prendi solo il payload (parte 2)
    const payload = parts[1]

    // Decodifica da base64url a stringa normale
    // base64url è simile a base64 ma usa caratteri diversi per essere URL-safe
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))

    // Converti la stringa JSON in oggetto JavaScript
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Errore decodifica JWT', error)
    throw new Error('Impossibile decodificare token JWT')
  }
}

// ============================================================================
// FUNZIONI PRINCIPALI
// ============================================================================

/**
 * Inizializza il composable di autenticazione
 * 
 * Questa funzione viene chiamata automaticamente quando il composable viene usato.
 * Si occupa di:
 * 1. Verificare che il Client ID sia configurato
 * 2. Caricare lo script GSI
 * 3. Inizializzare il client OAuth2
 * 
 * Viene chiamata automaticamente da onMounted (quando il componente viene montato)
 */
async function initialize(): Promise<void> {
  console.log(`[${COMPOSABLE_NAME}] Inizializzazione...`)

  try {
    // Imposta lo stato di loading
    setAuthState('loading')

    // Carica lo script GSI
    await loadGsiScript()

    // Inizializza il client OAuth2
    await initializeOAuthClient()

    console.log(`[${COMPOSABLE_NAME}] Inizializzazione completata`)
  } catch (error) {
    console.error(`[${COMPOSABLE_NAME}] Errore inizializzazione`, error)
    setAuthState('error', 'Impossibile inizializzare l\'autenticazione')
  }
}

/**
 * Avvia il flusso di autenticazione OAuth2
 * 
 * Questa funzione mostra il popup di Google dove l'utente può:
 * 1. Scegliere l'account Google da usare
 * 2. Dare il permesso all'app di leggere i calendari
 * 
 * Dopo che l'utente ha completato l'autenticazione,
 * handleOAuthResponse verrà chiamato automaticamente.
 */
function signIn(): void {
  console.log(`[${COMPOSABLE_NAME}] Avvio autenticazione...`)

  // Controlla se l'utente è già autenticato
  if (isAuthenticated.value) {
    console.warn(`[${COMPOSABLE_NAME}] Utente già autenticato`)
    return
  }

  // Controlla se lo script GSI è disponibile
  if (!(window as any).google?.accounts) {
    console.error(`[${COMPOSABLE_NAME}] Script GSI non disponibile`)
    setAuthState('error', 'Script Google non disponibile. Ricarica la pagina.')
    return
  }

  // Ottieni il client OAuth2
  const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: OAUTH_SCOPES,
    callback: handleOAuthResponse,
    error_callback: handleOAuthError,
  })

  // Avvia l'autenticazione aprendo il popup di Google
  tokenClient.requestAccessToken()

  console.log(`[${COMPOSABLE_NAME}] Popup di autenticazione aperto`)
}

/**
 * Esegue il logout dell'utente
 * 
 * Questa funzione:
 * 1. Svuota lo stato dell'utente
 * 2. Imposta lo stato come 'idle'
 * 3. Chiede a Google di revocare l'accesso (opzionale)
 * 
 * Nota: Il logout lato client non revoca completamente il token.
 * Per un logout completo, dovresti chiamare l'API di revoca di Google.
 */
function signOut(): void {
  console.log(`[${COMPOSABLE_NAME}] Logout in corso...`)

  // Svuota le informazioni dell'utente
  user.value = null

  // Svuota il messaggio di errore
  errorMessage.value = ''

  // Imposta lo stato come idle
  setAuthState('idle')

  console.log(`[${COMPOSABLE_NAME}] Logout completato`)
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Hook chiamato quando il composable viene usato per la prima volta
 * 
 * In Nuxt 3 con Vue 3, onMounted viene chiamato quando il componente
 * viene montato nel DOM. Qui usiamo onMounted per:
 * 1. Inizializzare automaticamente l'autenticazione
 * 2. Caricare lo script GSI quando necessario
 */
onMounted(() => {
  console.log(`[${COMPOSable_NAME}] Montato - avvio inizializzazione`)
  initialize()
})

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Composable per gestire l'autenticazione OAuth2 con Google
 * 
 * @returns Oggetto con:
 * - authState: Stato corrente dell'autenticazione
 * - user: Informazioni dell'utente autenticato
 * - errorMessage: Messaggio di errore (se presente)
 * - isAuthenticated: true se l'utente è autenticato
 * - signIn: Funzione per avviare l'autenticazione
 * - signOut: Funzione per effettuare il logout
 * 
 * @example
 * // Usa il composable in un componente Vue
 * const { authState, user, signIn, signOut } = useGoogleAuth()
 * 
 * // Mostra il pulsante di login solo se non autenticato
 * // <button v-if="!isAuthenticated" @click="signIn">Accedi con Google</button>
 * 
 * // Mostra le informazioni utente se autenticato
 * // <div v-else>Ciao, {{ user?.profile.name }}</div>
 */
export function useGoogleAuth() {
  return {
    // Stato
    authState,
    user,
    errorMessage,
    isAuthenticated,

    // Funzioni
    signIn,
    signOut,
  }
}
