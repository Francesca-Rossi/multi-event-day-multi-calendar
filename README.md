# Multi-Event Day Multi-Calendar

Web app in **Nuxt 3 + TypeScript + Tailwind CSS** che mostra gli eventi giornalieri di più calendari Google in una tabella oraria.

## Task 1 Completata: Scaffolding Progetto

Questa task ha creato la struttura di base del progetto.

### File creati:

1. **`nuxt.config.ts`** - Configurazione principale di Nuxt
   - Imposta Tailwind CSS
   - Configura le variabili d'ambiente per Google OAuth2
   - Disabilita SSR (Server-Side Rendering) per evitare problemi con le chiamate OAuth2 lato client

2. **`types/calendar.ts`** - Definizione dei tipi TypeScript
   - `CalendarEntry`: rappresenta un calendario con il suo ID e nome visualizzato
   - `CalendarConfig`: contiene la lista completa dei calendari configurati
   - `GoogleCalendarEvent`: rappresenta un evento del calendario Google

3. **`app.vue`** - Componente principale dell'applicazione
   - Carica lo script Google Identity Services (GSI) per l'autenticazione
   - Include tutte le pagine tramite `<NuxtPage />`

4. **`assets/css/tailwind.css`** - Stili Tailwind CSS
   - Importa i direttiva base di Tailwind

5. **`.env`** - File delle variabili d'ambiente
   - Contiene il Client ID OAuth2 di Google (da compilare)

6. **Struttura cartelle**:
   - `pages/` - Pagine dell'applicazione
   - `composables/` - Logica riutilizzabile (composables Vue)
   - `components/` - Componenti Vue riutilizzabili
   - `types/` - Definizioni TypeScript

---

## Task 2 Completata: Composable `useCalendarConfig`

Questa task ha creato il composable per gestire la configurazione dei calendari.

### File creati:

1. **`composables/useCalendarConfig.ts`** - Gestione della configurazione calendari

   **Responsabilità:**
   - Leggere e scrivere la lista di calendari da `localStorage` (chiave: `calendar_config`)
   - Gestire casi di errore (localStorage vuoto o dati corrotti)
   - Fornire funzioni per aggiungere, rimuovere e aggiornare calendari

   **Funzioni esposte:**

   - **`calendars`** (ref) - Array reattivo contenente tutti i calendari configurati
   - **`addCalendar(id, displayName?)`** - Aggiunge un nuovo calendario alla lista
   - **`removeCalendar(id)`** - Rimuove un calendario dalla lista
   - **`updateDisplayName(id, name)`** - Aggiorna il nome visualizzato di un calendario
   - **`saveConfig()`** - Salva esplicitamente la configurazione in localStorage
   - **`hasCalendars`** (computed) - Restituisce true se ci sono calendari configurati

   **Spiegazione del codice:**

   Il composable `useCalendarConfig` è una funzione che incapsula tutta la logica per gestire i calendari. Immaginalo come una "macchinetta" che:
   
   - All'inizializzazione carica i calendari salvati in localStorage
   - Quando aggiungi o rimuovi un calendario, lo salva automaticamente
   - Fornisce dati reattivi che si aggiornano automaticamente in tutte le pagine
   
   **Funzione `loadConfig()`:**
   - Legge dal localStorage la stringa JSON salvata
   - La converte in un oggetto JavaScript usando `JSON.parse()`
   - Controlla che i dati siano validi (se sono corrotti, parte da un array vuoto)
   - Gestisce gli errori con try/catch per evitare crash dell'applicazione
   
   **Funzione `saveConfig()`:**
   - Prende l'array di calendari attuale
   - Lo converte in stringa JSON usando `JSON.stringify()`
   - Lo salva in localStorage con la chiave `calendar_config`
   
   **Funzione `addCalendar()`:**
   - Normalizza l'ID (rimuove spazi extra)
   - Controlla se il calendario esiste già per evitare duplicati
   - Crea un oggetto `CalendarEntry` con ID e nome
   - Lo aggiunge all'array e salva automaticamente
   
   **Funzione `removeCalendar()`:**
   - Usa `filter()` per creare un nuovo array senza il calendario da rimuovere
   - Salva automaticamente le modifiche
   
   **Funzione `updateDisplayName()`:**
   - Trova il calendario con l'ID specificato
   - Aggiorna il campo `displayName`
   - Salva le modifiche
   
   **Computed `hasCalendars`:**
   - È una funzione speciale di Vue che si ricomputa automaticamente quando `calendars` cambia
   - Utile per abilitare/disabilitare bottoni (es. "Vai alla Dashboard" solo se ci sono calendari)

---

## Task 3 Completata: Composable `useGoogleAuth`

Questa task ha creato il composable per gestire l'autenticazione OAuth2 con Google.

### File creati:

1. **`composables/useGoogleAuth.ts`** - Gestione dell'autenticazione OAuth2

   **Responsabilità:**
   - Caricare dinamicamente lo script Google Identity Services (GSI)
   - Inizializzare il client OAuth2 di Google
   - Gestire il flusso di autenticazione (popup di Google)
   - Decodificare l'ID token per ottenere le informazioni dell'utente
   - Gestire errori e stati di autenticazione

   **Funzioni esposte:**

   - **`authState`** (ref) - Stato corrente: 'idle', 'loading', 'authenticated', 'error'
   - **`user`** (ref) - Informazioni dell'utente autenticato (token, email, nome, foto)
   - **`errorMessage`** (ref) - Messaggio di errore (se presente)
   - **`isAuthenticated`** (computed) - True se l'utente è autenticato
   - **`signIn()`** - Avvia il flusso di autenticazione OAuth2
   - **`signOut()`** - Effettua il logout dell'utente

   **Spiegazione del codice:**

   Il composable `useGoogleAuth` gestisce tutto il processo di autenticazione con Google. È come un "portiere" che:
   
   1. All'inizio carica lo script GSI (Google Identity Services)
   2. Quando l'utente clicca "Accedi", apre il popup di Google
   3. Dopo che l'utente si autentica, salva le informazioni
   4. Fornisce funzioni per fare il logout
   
   **Funzione `loadGsiScript()`:**
   - Carica dinamicamente lo script di Google che gestisce l'autenticazione
   - Usa `document.createElement('script')` per aggiungere lo script alla pagina
   - Ha un timeout di 10 secondi per evitare che rimanga bloccato
   - Se lo script è già caricato, non lo ricarica di nuovo
   
   **Funzione `initializeOAuthClient()`:**
   - Crea un client OAuth2 usando il Client ID configurato
   - Configura gli scope richiesti: 'openid' (profilo), 'email' (email), 'calendar' (calendari)
   - Imposta due callback:
     - `callback`: chiamato quando l'utente si autentica con successo
     - `error_callback`: chiamato quando si verifica un errore
   
   **Funzione `handleOAuthResponse()`:**
   - Riceve la risposta di Google contenente il token
   - Estrae il token di accesso (usato per le chiamate API)
   - Decodifica l'ID token per ottenere email, nome e foto
   - Salva tutto nello stato reattivo `user`
   - Imposta `authState` a 'authenticated'
   
   **Funzione `decodeJwt()`:**
   - I token di Google sono JWT (JSON Web Token)
   - Un JWT ha 3 parti separate da punti: header.payload.signature
   - Questa funzione prende la parte centrale (payload) e la decodifica
   - Usa `atob()` per convertire da base64 a testo normale
   - Restituisce un oggetto con email, nome, foto, ecc.
   
   **Funzione `signIn()`:**
   - Controlla se l'utente è già autenticato (se sì, non fa nulla)
   - Crea un nuovo client OAuth2 (se non esiste già)
   - Chiede a Google di aprire il popup di autenticazione
   - Dopo che l'utente si autentica, `handleOAuthResponse` viene chiamato automaticamente
   
   **Funzione `signOut()`:**
   - Svuota le informazioni dell'utente
   - Svuota il messaggio di errore
   - Imposta lo stato come 'idle'
   - Nota: il logout è solo lato client, per un logout completo servirebbe chiamare l'API di revoca di Google
   
   **Computed `isAuthenticated`:**
   - Restituisce true solo se `authState` è 'authenticated' E `user` non è null
   - Utile per mostrare/nascondere il pulsante di login
   - Si aggiorna automaticamente quando cambia `authState` o `user`
   
   **Hook `onMounted()`:**
   - Viene chiamato automaticamente quando il composable viene usato
   - Avvia l'inizializzazione dell'autenticazione
   - Carica lo script GSI e inizializza il client OAuth2

---

## Task 4 Completata: Composable `useCalendarEvents`

Questa task ha creato il composable per recuperare gli eventi dai calendari Google.

### File creati:

1. **`composables/useCalendarEvents.ts`** - Fetch e gestione degli eventi

   **Responsabilità:**
   - Chiamare l'API di Google Calendar per ogni calendario configurato
   - Unire gli eventi da tutti i calendari in una lista
   - Filtrare gli eventi per la data selezionata
   - Ordinare gli eventi per orario di inizio
   - Gestire errori di rete e timeout
   - Formattare date e orari per la visualizzazione

   **Funzioni esposte:**

   - **`events`** (ref) - Lista di eventi recuperati e ordinati
   - **`selectedDate`** (ref) - Data per cui sono stati recuperati gli eventi
   - **`fetchState`** (ref) - Stato: 'idle', 'loading', 'success', 'error'
   - **`errorMessage`** (ref) - Messaggio di errore (se presente)
   - **`isLoading`** (computed) - True se gli eventi sono in caricamento
   - **`hasError`** (computed) - True se c'è stato un errore
   - **`hasSuccess`** (computed) - True se gli eventi sono stati caricati
   - **`hasEvents`** (computed) - True se ci sono eventi da visualizzare
   - **`fetchAllEvents(params)`** - Funzione principale per recuperare gli eventi
   - **`fetchEventsForDate(date, calendars, token)`** - Helper per una data specifica
   - **`fetchTodayEvents(calendars, token)`** - Helper per la data odierna
   - **`formatTime(dateTime)`** - Formatta un'ora per la visualizzazione
   - **`formatDate(date)`** - Formatta una data per la visualizzazione

   **Spiegazione del codice:**

   Il composable `useCalendarEvents` è come un "ragazzo delle consegne" che:
   
   1. Quando gli chiedi gli eventi, chiama tutte le API dei calendari
   2. Riceve gli eventi da ogni calendario
   3. Li unisce in una lista unica
   4. Li filtra (toglie quelli passati) e li ordina per orario
   5. Li restituisce pronti per essere visualizzati
   
   **Funzione `fetchCalendarEvents()`:**
   - Costruisce l'URL dell'API di Google con i parametri corretti
   - Usa `fetch()` per fare la richiesta HTTP GET
   - Aggiunge le intestazioni HTTP:
     - `Authorization: Bearer {token}` per l'autenticazione
     - `Content-Type: application/json` per specificare il formato
   - Usa `AbortController` per gestire il timeout (30 secondi)
   - Se la risposta non è ok (status 400-599), lancia un errore
   - Estrae la lista di eventi dal JSON di risposta
   - Aggiunge l'ID del calendario a ogni evento per sapere da quale proviene
   
   **Funzione `getTimeRangeForDate()`:**
   - Gli eventi possono iniziare prima e finire dopo la mezzanotte
   - Per includere tutti gli eventi rilevanti, fetchiamo:
     - Un'ora prima della mezzanotte (per eventi che finiscono dopo mezzanotte)
     - Un'ora dopo la mezzanotte (per eventi che iniziano prima di mezzanotte)
   - Formatta l'intervallo nel formato ISO 8601 richiesto da Google
   
   **Funzione `formatDateToGoogle()`:**
   - L'API di Google richiede date nel formato ISO 8601
   - Esempio: `2024-01-15T09:30:00+01:00`
   - Estrae anno, mese, giorno, ore, minuti, secondi dalla data
   - Calcola il fuso orario locale in formato `+01:00`
   - Formatta tutto in una stringa ISO 8601
   
   **Funzione `processEvents()`:**
   - Riceve tutti gli eventi da tutti i calendari
   - **Filtraggio**: Esclude gli eventi già terminati (fine < ora corrente)
   - **Ordinamento**: Ordina gli eventi per orario di inizio (dal più presto al più tardi)
   - Restituisce la lista filtrata e ordinata
   
   **Funzione `fetchAllEvents()`:**
   - Questa è la funzione principale che fa tutto il lavoro:
     1. Imposta lo stato di `loading`
     2. Calcola l'intervallo di tempo per la data selezionata
     3. Fa una richiesta parallela a ogni calendario (usa `Promise.allSettled`)
     4. `Promise.allSettled` aspetta che TUTTE le richieste finiscano, anche se alcune falliscono
     5. Estrae solo gli eventi delle richieste di successo
     6. Elabora gli eventi (filtra e ordina) con `processEvents()`
     7. Aggiorna lo stato con gli eventi elaborati
     8. Imposta lo stato di `success`
   
   **Perché `Promise.allSettled` invece di `Promise.all`?**
   - `Promise.all` si ferma al primo errore
   - `Promise.allSettled` aspetta che TUTTE le richieste finiscano
   - In questo caso vogliamo gli eventi DA TUTTI i calendari, anche se uno fallisce
   - Se un calendario non risponde, mostriamo un warning ma continuiamo con gli altri
   
   **Funzione `formatTime()`:**
   - Prende una data e ora (stringa ISO 8601)
   - Estrae ore e minuti
   - Restituisce una stringa formattata: "09:30"
   - Se la data è null/undefined, restituisce "--:--"
   
   **Funzione `formatDate()`:**
   - Usa `toLocaleDateString()` di JavaScript
   - Formatta la data in italiano: "Lunedì 15 Gennaio 2024"
   - Usa le opzioni: weekday (giorno della settimana), day (giorno), month (mese), year (anno)
   
    **Computed properties:**
    - `isLoading`: True se `fetchState` è 'loading' (utile per mostrare uno spinner)
    - `hasError`: True se `fetchState` è 'error' (utile per mostrare un messaggio di errore)
    - `hasSuccess`: True se `fetchState` è 'success' (utile per abilitare/disabilitare bottoni)
    - `hasEvents`: True se ci sono eventi nell'array (utile per mostrare "Nessun evento")

---

## Task 5 Completata: Settings Page

Questa task ha creato la pagina delle impostazioni per gestire i calendari Google e l'autenticazione.

### File creati:

1. **`layouts/default.vue`** - Layout principale con navigazione
   
   **Struttura:**
   - Header fisso con titolo dell'applicazione
   - Navigation bar con link a Dashboard e Settings
   - Contenitore principale per il contenuto delle pagine
   - Stili Tailwind CSS per un design pulito e responsive

2. **`pages/settings/index.vue`** - Pagina settings completa
   
   **Funzionalità implementate:**
   
   **Sezione Authentication Status:**
   - Mostra lo stato di autenticazione Google (autenticato/non autenticato)
   - Visualizza informazioni utente (nome, email, foto profilo) quando autenticati
   - Pulsante "Sign In with Google" per avviare il flusso OAuth2
   - Pulsante "Sign Out" per effettuare il logout
   - Messaggi di errore durante l'autenticazione
   
   **Sezione Add Calendar:**
   - Form per inserire il Calendar ID di Google
   - Validazione client-side dell'ID calendario:
     - Campo obbligatorio
     - Lunghezza minima verificata
     - Controllo duplicati (evita calendari già aggiunti)
     - Formato accettabile (deve contenere '@' o iniziare con 'primary')
   - Campo opzionale per il display name (nome visualizzato)
   - Feedback visivo per errori di validazione
   - Stato loading durante l'aggiunta
   
   **Sezione Configured Calendars:**
   - Lista di tutti i calendari configurati
   - Visualizza nome display e ID di ogni calendario
   - Bottone modifica (pencil icon) per cambiare il display name
   - Bottone rimuovi (trash icon) per eliminare il calendario
   - Conferma prima di rimuovere un calendario
   - Stato vuoto quando nessun calendario è configurato
   - Salvataggio automatico in localStorage tramite useCalendarConfig

3. **Dipendenze aggiunte:**
   - `@nuxt/ui` - Component UI pre-costruiti per Nuxt 3
   - Utilizzati componenti: `UCard`, `UInput`, `UButton`, `Icon`

**Spiegazione del codice:**

La pagina settings è organizzata in tre sezioni principali usando il layout default:

**Header e Navigazione (layouts/default.vue):**
- Il layout viene applicato automaticamente a tutte le pagine
- Usa `<NuxtLink>` per la navigazione tra pagine (routing client-side)
- Highlight visivo della pagina attiva con classi condizionali
- Design semplice ma funzionale con header fisso in alto

**Pagina Settings (pages/settings/index.vue):**

*Gestione Autenticazione:*
```javascript
const { signIn, signOut, authState, user, errorMessage, isAuthenticated } = useGoogleAuth()
```
- De-struttura dal composable `useGoogleAuth` tutte le variabili necessarie
- `isAuthenticated` determina quale sezione mostrare (login o info utente)
- `authState` controlla lo stato di loading durante l'autenticazione
- I pulsanti chiamano `handleSignIn()` e `handleSignOut()` che gestiscono gli errori

*Form Aggiunta Calendario:*
```javascript
const validateCalendarId = () => {
  errors.value = {}
  const id = newCalendarId.value.trim()
  
  if (!id) {
    errors.value.calendarId = 'Calendar ID is required'
    return false
  }
  
  // Altre validazioni...
  return true
}
```
- Funzione di validazione centralizzata
- Resetta gli errori prima di ogni validazione
- Controlla duplicati confrontando con `calendars.value`
- Restituisce false se ci sono errori, bloccando l'invio del form

*Gestione Lista Calendari:*
```javascript
const handleRemoveCalendar = (calendarId) => {
  if (confirm(`Are you sure you want to remove this calendar?`)) {
    removeCalendar(calendarId)
    console.log('Calendar removed:', calendarId)
  }
}
```
- Usa `confirm()` nativo di browser per la conferma
- Chiama `removeCalendar()` dal composable useCalendarConfig
- Logga l'operazione in console per debug
- La rimozione è immediata e persistente in localStorage

*Editing Display Name:*
```javascript
const handleUpdateDisplayName = (calendar) => {
  editingCalendarId.value = calendar.id
  editingName.value = calendar.displayName || ''
}
```
- Attiva la modalità edit per un calendario specifico
- Salva l'ID del calendario e il nome corrente
- L'utente può modificare il nome direttamente nell'interfaccia
- Al salvaggio, chiama `updateDisplayName()` per aggiornare

**Flusso completo dell'utente:**

1. **Primo accesso:**
   - Utente vede pagina settings vuota
   - Sezione authentication mostra pulsante "Sign In with Google"
   - Utente clicca e si autentica con Google

2. **Aggiungere un calendario:**
   - Dopo login, utente inserisce Calendar ID (es: "team@group.calendar.google.com")
   - Inserisce opzionalmente un display name (es: "Team Calendar")
   - Clicca "Add Calendar"
   - Validazione client-side verifica formato e duplicati
   - Se valido, il calendario viene aggiunto e salvato in localStorage
   - Appare nella lista "Configured Calendars"

3. **Gestire calendari:**
   - Ogni calendario nella lista ha due bottoni: modifica e rimuovi
   - Modifica: clicca pencil icon, cambia il nome, salva automaticamente
   - Rimuovi: clicca trash icon, conferma con dialog, calendario rimosso

4. **Logout:**
   - Clicca "Sign Out" nella sezione authentication
   - Le informazioni utente vengono svuotate
   - I calendari rimangono salvati in localStorage (persistenza)

**Perché usare @nuxt/ui?**

Invece di creare tutti i componenti UI da zero con Tailwind CSS, abbiamo installato `@nuxt/ui` che offre:
- Componenti pre-stilizzati e accessibili
- Integrazione automatica con Tailwind CSS
- Supporto per dark mode
- Proprietà reattive pronte all'uso
- Minor codice boilerplate

Componenti usati:
- `UCard`: Container con header, body e footer stilizzati
- `UInput`: Input field con stati focus/error integrati
- `UButton`: Bottoni con varianti (ghost, solid) e colori
- `Icon`: Sistema di icone integrato (Heroicons)

---

## Task 6 Completata: Dashboard Page

Questa task ha creato la pagina principale per visualizzare gli eventi giornalieri.

### File creati/modificati:

1. **`pages/dashboard.vue`** - Pagina dashboard principale

**Responsabilità:**
- Mostra la data odierna formattata in italiano (es. "Mercoledì 18 giugno 2025") nell'header
- Link ⚙️ per tornare alle impostazioni
- Se non autenticato: mostra bottone "Accedi con Google" centrato
- Se autenticato: carica automaticamente gli eventi e mostra la tabella oraria
- Stati di loading, errore e vuoto gestiti

**Spiegazione del codice:**

*Autenticazione e fetch automatico:*
```javascript
const { calendars } = useCalendarConfig()
const { accessToken, isAuthenticated, signIn } = useGoogleAuth()
const { eventsByCalendar, errors, isLoading, fetchTodayEvents, formatDate } = useCalendarEvents()
```
- Usa i tre composable: config calendari, autenticazione Google e fetch eventi
- `watch(isAuthenticated)` carica gli eventi non appena l'utente si autentica
- `onMounted` gestisce il caso in cui l'utente sia già autenticato al primo accesso

*Header:*
- Data odierna formattata in italiano con `formatDate(new Date())`
- Link a `/settings` con icona ⚙️

*Contenuto condizionale:*
- `v-if="!isAuthenticated"` → bottone "Accedi con Google"
- Altrimenti → `<CalendarTable>` con calendari, eventi ed errori

---

## Task 7 Completata: CalendarTable Component

Questa task ha creato il componente tabella oraria che mostra gli eventi di tutti i calendari configurati.

### File creati:

1. **`components/CalendarTable.vue`** - Tabella oraria principale
2. **`components/CalendarCell.vue`** - Singola cella evento
3. **`components/EventChip.vue`** - Chip con il nome dell'evento

**Responsabilità:**

*CalendarTable.vue:*
- Genera le righe orarie dalle `08:00` alle `20:00` (13 righe, slot da 60 minuti)
- Una colonna per ogni calendario configurato
- Header con i nomi visualizzati dei calendari
- Scroll orizzontale su schermi stretti
- Stati: loading (spinner), errore globale, nessun calendario configurato
- Gestione errori per singolo calendario: se un calendario risponde 403/404, mostra "⚠ Errore accesso" nella sua colonna senza bloccare le altre

*CalendarCell.vue:*
- Trova l'evento attivo per un'ora specifica
- Usa l'intervallo `[start, end)`: l'evento è attivo se `startHour <= hour < endHour`
- Mostra l'`EventChip` se c'è un evento, altrimenti `—` in grigio

*EventChip.vue:*
- Visualizza il nome dell'evento in un chip colorato
- Props: `eventName`, `backgroundColor`, `textColor`
- Emette evento `click`

**Prop del componente CalendarTable:**
```typescript
props: {
  calendars: CalendarEntry[]
  eventsByCalendar: Map<string, GoogleCalendarEvent[]>
  errors: Map<string, string>       // errori per calendario (403/404)
  isLoading: boolean
  errorMessage?: string
}
```

**Gestione errori per calendario:**

In `useCalendarEvents` è stata aggiunta una `Map` `errors` che traccia gli errori di ogni singolo calendario:
- Azzerata a ogni nuovo fetch
- Popolata quando un calendario non risponde (es. 403/404)
- In `CalendarTable`, se `errors.get(id)` è valorizzato, nell'header della colonna appare "⚠ Errore accesso" con il messaggio reale in `title`
- Gli errori di un calendario non bloccano la visualizzazione degli altri

**Bug fix:**
- Corretto typo `COMPOSable_NAME` → `COMPOSABLE_NAME` in `composables/useGoogleAuth.ts` (evitava un errore runtime al mount)

---

## Prerequisiti da completare:

1. **Configurare Google Cloud Console**:
   - Abilitare Google Calendar API
   - Creare credenziali OAuth2 (Client ID)
   - Aggiungere il Client ID nel file `.env`

2. **Installare le dipendenze**:
   ```bash
   npm install
   ```

3. **Avviare l'applicazione**:
   ```bash
   npm run dev
   ```

## Prossime Task:

- **Task 8**: Creare pagina `/index` con redirect automatico
- **Task 9**: Aggiungere controlli di navigazione date
- **Task 10**: Configurare file environment (.env.example)
- **Task 11**: Scrivere test unitari e di integrazione
- **Task 12**: Aggiornare documentazione
- **Task 13**: Deploy in produzione

## Spiegazione del codice per principianti:

### Cos'è Nuxt 3?
Nuxt è un framework basato su Vue.js che facilita la creazione di applicazioni web. Offre funzionalità come:
- Routing automatico (le pagine sono i file nella cartella `pages/`)
- Gestione dello stato
- Ottimizzazioni per le prestazioni

### Cos'è TypeScript?
TypeScript è una versione migliorata di JavaScript che aggiunge i "tipi". I tipi aiutano a:
- Evitare errori (es. usare una stringa quando ci si aspetta un numero)
- Capire meglio il codice (sai cosa aspettarti da una variabile)
- Ricevere suggerimenti automatici nell'editor

### Cos'è Tailwind CSS?
Tailwind è un framework CSS che ti permette di scrivere stili direttamente nell'HTML usando classi utility. Esempio:
```html
<div class="bg-blue-500 text-white p-4">
  Ciao Mondo
</div>
```
Significa: sfondo blu chiaro, testo bianco, padding di 1rem.

### Cos'è un Composable?
Nei composables (come `useCalendarConfig`) si scrive la logica riutilizzabile. Sono funzioni che possono:
- Gestire dati reattivi (che si aggiornano automaticamente quando cambiano)
- Essere importate in qualsiasi componente
- Controllare la logica senza preoccuparsi dell'interfaccia grafica

### Cos'è OAuth2?
OAuth2 è un protocollo che permette di accedere a servizi (come Google Calendar) senza condividere la password. Invece:
1. L'utente clicca "Accedi con Google"
2. Google chiede il permesso
3. Google restituisce un token temporaneo
4. L'app usa quel token per leggere il calendario
