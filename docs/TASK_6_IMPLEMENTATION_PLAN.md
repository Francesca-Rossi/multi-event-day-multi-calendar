# Piano di Implementazione: Task 6 - Dashboard Page

## Introduzione

Questo documento ti guiderà passo-passo nella creazione della pagina Dashboard, che mostrerà tutti gli eventi del calendario per una data specifica.

Se stai leggendo questo documento, significa che:
- Hai già completato le Task 1-5 (scaffolding, configurazioni, autenticazione, settings)
- Vuoi imparare come creare una pagina completa in Nuxt 3
- Non hai molta esperienza con Nuxt, Vue o TypeScript

Non preoccuparti! Questo piano è scritto per principianti e spiega ogni concetto in dettaglio.

---

## Cosa Dovremo Costruire

La pagina Dashboard dovrà avere queste funzionalità:

1. Mostrare la data selezionata in modo chiaro e visibile
2. Visualizzare una lista di eventi per quella data
3. Navigare tra le date (giorno precedente / giorno successivo)
4. Gestire stati di caricamento (quando stiamo recuperando gli eventi)
5. Gestire errori (se qualcosa va storto nel recupero dati)
6. Mostrare uno stato vuoto quando non ci sono eventi

### Come si presenterà l'interfaccia

Immagina questa struttura semplice con header fisso in alto, navigazione tra pagine, e una card principale che mostra la data corrente con bottoni di navigazione e la lista degli eventi.

---

## Parte 1: Creare la Struttura del Progetto

### Passo 1.1: Capire come funziona il routing in Nuxt

In Nuxt 3, il routing è automatico. Questo significa che non devi configurare manualmente i percorsi delle pagine.

**Come funziona:**

1. La cartella pages/ contiene tutte le tue pagine
2. Ogni file .vue in pages/ diventa automaticamente un percorso URL
3. La struttura delle cartelle crea percorsi gerarchici

**Esempi:**

| File Path | URL corrispondente |
|-----------|-------------------|
| pages/index.vue | / (homepage) |
| pages/settings/index.vue | /settings |
| pages/dashboard.vue | /dashboard (quello che dobbiamo creare!) |
| pages/about.vue | /about |

**Perché questo è utile?**
- Non devi scrivere codice per gestire i percorsi
- Aggiungere una nuova pagina significa solo creare un nuovo file
- I link tra pagine sono semplici da fare con <NuxtLink>

### Passo 1.2: Creare il file della pagina Dashboard

Ora creiamo il file per la pagina Dashboard.

**Azione:** Crea un nuovo file chiamato dashboard.vue all'interno della cartella pages/.

Il percorso completo sarà: pages/dashboard.vue

**Spiegazione:**

Quando creerai questo file:
1. Nuxt lo riconoscerà automaticamente
2. Diventerà disponibile al percorso /dashboard
3. Potrai accedervi digitando http://localhost:3000/dashboard nel browser
4. Il layout default.vue verrà applicato automaticamente (l'header e la navigazione)

### Passo 1.3: Aggiungere un link alla pagina Dashboard

Prima di vedere la pagina, dobbiamo renderla accessibile dalla navigazione.

Apri il file layouts/default.vue e troverai qualcosa simile a questo:

`html
<nav class=
flex
space-x-4>
  <NuxtLink to=/>Home</NuxtLink>
  <NuxtLink to=/settings>Settings</NuxtLink>
</nav>
`

Dobbiamo aggiungere un terzo link:

`html
<nav class=flex
space-x-4>
  <NuxtLink to=/>Home</NuxtLink>
  <NuxtLink to=/dashboard>Dashboard</NuxtLink>
  <NuxtLink to=/settings>Settings</NuxtLink>
</nav>
`

**Spiegazione dei componenti:**

- <NuxtLink>: È un componente speciale di Nuxt che sostituisce il tag <a> normale.
  - Quando clicchi su un <NuxtLink>, Nuxt cambia la pagina senza ricaricare tutto il sito (client-side routing)
  - È molto più veloce perché non deve scaricare di nuovo HTML, CSS e JavaScript
  - Rileva automaticamente se sei sulla pagina corrente e può applicare classi diverse

**Vantaggi di <NuxtLink> rispetto a <a>:**
- Navigazione istantanea tra pagine
- Pre-carica le pagine in background
- Gestione automatica dello stato attivo
- Migliore esperienza utente

---

## Parte 2: Comprendere useCalendarEvents

Prima di scrivere codice, dobbiamo capire cosa fa il composable useCalendarEvents che abbiamo già creato nella Task 4.

### Cos'è un Composable?

Un composable è una funzione in Vue 3 che:
- Contiene logica riutilizzabile
- Gestisce dati reattivi (dati che si aggiornano automaticamente quando cambiano)
- Può essere importata in qualsiasi componente o pagina
- Segue una convenzione: inizia con use (es: useCalendarEvents, useGoogleAuth)

**Analogia:** Immagina un composable come una macchinetta del caffè:
- Tu dai in ingresso i parametri corretti (acqua, caffe, zucchero)
- La macchinetta fa tutto il lavoro interno
- Tu ricevi il risultato pronto (un caffe delizioso)
- Non devi sapere come funziona internamente la macchinetta

### Cosa restituisce useCalendarEvents?

Quando usi useCalendarEvents() nella tua pagina, ottieni indietro un oggetto con molte proprieta utili. Vediamole una per una:

#### Proprieta di Stato

| Proprieta | Tipo | Significato | Esempio d'uso |
|-----------|------|-------------|---------------|
| events | ref<Array> | Lista di eventi recuperati | v-for=event in events |
| selectedDate | ref<Date | null> | Data per cui sono stati recuperati gli eventi | Mostrare la data corrente |
| fetchState | ref<string> | Stato attuale del fetch | idle, loading, success, error |
| errorMessage | ref<string> | Messaggio di errore (se presente) | Mostrare all'utente cosa e andato storto |

#### Computed Properties (proprieta calcolate automaticamente)

| Proprieta | Ritorna | Significato | Esempio d'uso |
|-----------|---------|-------------|---------------|
| isLoading | boolean | true se gli eventi sono in caricamento | Mostrare uno spinner |
| hasError | boolean | true se c'e stato un errore | Mostrare messaggio di errore |
| hasSuccess | boolean | true se gli eventi sono stati caricati | Abilitare/disabilitare bottoni |
| hasEvents | boolean | true se ci sono eventi da visualizzare | Mostrare Nessun evento |

#### Funzioni Disponibili

| Funzione | Parametri | Cosa fa | Esempio |
|----------|-----------|---------|---------|
| fetchAllEvents(params) | {date, calendars, token} | Recupera tutti gli eventi per una data | await fetchAllEvents({date, ...}) |
| formatTime(dateTime) | string | Formatta un orario | formatTime('2024-01-15T09:30:00') -> '09:30' |
| formatDate(date) | Date | Formatta una data | formatDate(new Date()) -> Lunedì 15 Gennaio 2024 |

### Come usare un Composable

Ecco il pattern standard per usare un composable in una pagina Vue:

`javascript
<script setup>
// Chiama il composable per ottenere tutte le proprieta e funzioni
const {
  events,              // Lista di eventi
  selectedDate,        // Data selezionata
  fetchState,          // Stato del fetch
  errorMessage,        // Messaggio di errore
  isLoading,           // True se loading
  hasError,            // True se errore
  hasSuccess,          // True se successo
  hasEvents,           // True se ci sono eventi
  fetchAllEvents,      // Funzione per recuperare eventi
  formatTime,          // Funzione per formattare orari
  formatDate,          // Funzione per formattare date
} = useCalendarEvents()

// Ora puoi usare queste variabili nel template!
</script>
`

**Nota importante:** In Nuxt 3, i composables nella cartella composables/ sono automaticamente importabili. Non devi scrivere import. Basta chiamarlo direttamente!

---

## Parte 3: Creare il Template della Pagina

Ora creiamo l'interfaccia grafica della pagina Dashboard usando Vue Templates e Tailwind CSS.

### Passo 3.1: Struttura Base del Template

Inizia creando questa struttura base nel file pages/dashboard.vue:

`html
<template>
  <div class=\
max-w-4xl
mx-auto
px-4
sm:px-6
lg:px-8
py-8\>
    
    <!-- Sezione 1: Intestazione con Data e Navigazione -->
    <UCard>
      <template #header>
        <div class=\flex
items-center
justify-between\>
          <!-- Qui metteremo la data e i bottoni di navigazione -->
        </div>
      </template>
      
      <template #default>
        <!-- Qui metteremo la lista degli eventi -->
      </template>
    </UCard>
    
  </div>
</template>
`

**Spiegazione del codice:**

1. <template>: È la sezione che contiene l'HTML del componente
2. <div class=\...\>: Un contenitore principale con classi Tailwind per:
   - max-w-4xl: Larghezza massima di 80rem (circa 1280px)
   - mx-auto: Centra orizzontalmente il contenitore
   - px-4 sm:px-6 lg:px-8: Padding laterale che cambia in base alla dimensione dello schermo
   - py-8: Padding verticale di 2rem
3. <UCard>: Componente di @nuxt/ui che crea un card stilizzata con header, body e footer
4. #header: Slot personalizzato per l'intestazione della card
5. #default: Slot per il contenuto principale della card (il corpo)

### Passo 3.2: Aggiungere la Visualizzazione della Data

Sostituisci il commento nella sezione header con questo:

`html
<h2 class=\text-2xl
font-bold
text-gray-900\>
  {{ formattedSelectedDate }}
</h2>
`

Ma aspetta! Dobbiamo prima creare una variabile per formattare la data. Nel <script setup> aggiungi:

`javascript
// Calcola la data formattata usando la funzione del composable
const formattedSelectedDate = computed(() => {
  // Se selectedDate e null, usa la data odierna
  const dateToUse = selectedDate.value || new Date()
  
  // Usa la funzione formatDate dal composable
  return formatDate(dateToUse)
})
`

**Spiegazione di computed:**

- computed è una funzione di Vue che crea una proprieta calcolata
- Si ricomputa automaticamente quando le variabili su cui dipende cambiano
- È efficiente perché memorizza il risultato e lo ricalcola solo quando necessario

**Analogia:** Immagina computed come un calcolo automatico in Excel:
- Se cambi il valore di una cella, tutti i calcoli che dipendono da quella cella si aggiornano automaticamente
- Non devi riscrivere la formula ogni volta
- Vue fa tutto per te

### Passo 3.3: Aggiungere i Bottoni di Navigazione

Aggiungi questi bottoni accanto alla data:

`html
<div class=\flex
items-center
gap-4\>
  <!-- Bottoni di navigazione -->
  <UButton
    icon=\heroicons:arrow-left\
    color=\gray\
    variant=\ghost\
    :disabled=\isOnFirstDay\
    @click=\goToPreviousDay\
  >
    Indietro
  </UButton>
  
  <UButton
    icon=\heroicons:arrow-right\
    color=\gray\
    variant=\ghost\
    :disabled=\isOnLastDay\
    @click=\goToNextDay\
  >
    Avanti
  </UButton>
</div>
`

**Spiegazione dei componenti UButton:**

- icon: Nome dell'icona da usare (dal pacchetto Heroicons)
- color: Colore del bottone (gray, blue, red, ecc.)
- variant: Stile del bottone (ghost = trasparente con bordo, solid = pieno)
- :disabled: Disabilita il bottone se la condizione e true
- @click: Evento che viene eseguito quando clicchi sul bottone

**Nota sulle icone:** Usiamo heroicons:* perche @nuxt/ui integra Heroicons, una libreria di icone gratuite e bellissime. Puoi trovare altre icone su https://heroicons.com

### Passo 3.4: Completare l'Header Completo

L'header completo dovrebbe apparire così:

`html
<UCard>
  <template #header>
    <div class=\flex
flex-col
sm:flex-row
sm:items-center
sm:justify-between
gap-4\>
      <!-- Data -->
      <h2 class=\text-2xl
font-bold
text-gray-900\>
        {{ formattedSelectedDate }}
      </h2>
      
      <!-- Bottoni di navigazione -->
      <div class=\flex
items-center
gap-4\>
        <UButton
          icon=\heroicons:arrow-left\
          color=\gray\
          variant=\ghost\
          :disabled=\isOnFirstDay\
          @click=\goToPreviousDay\
        >
          Indietro
        </UButton>
        
        <UButton
          icon=\heroicons:arrow-right\
          color=\gray\
          variant=\ghost\
          :disabled=\isOnLastDay\
          @click=\goToNextDay\
        >
          Avanti
        </UButton>
      </div>
    </div>
  </template>
  
  <!-- Corpo della card (contenuto principale) -->
  <template #default>
    <!-- Qui andranno gli eventi o gli stati speciali -->
  </template>
</UCard>
`

**Spiegazione delle classi Tailwind:**

- flex: Attiva Flexbox (layout flessibile)
- flex-col sm:flex-row: Colonna su mobile, riga su schermi medio/grandi
- items-center: Allinea gli elementi al centro verticalmente
- justify-between: Distribuisce gli elementi con spazio uguale tra loro
- gap-4: Spazio di 1rem tra gli elementi
- sm:: Prefisso che rende la classe valida solo su schermi medio/grandi (>=640px)

---

## Parte 3: Creare il Template della Pagina

Ora creiamo l'interfaccia grafica della pagina Dashboard usando Vue Templates e Tailwind CSS.

### Passo 3.1: Struttura Base del Template

Inizia creando questa struttura base nel file pages/dashboard.vue:

`html
<template>
  <div class=\
max-w-4xl
mx-auto
px-4
sm:px-6
lg:px-8
py-8\>
    
    <!-- Sezione 1: Intestazione con Data e Navigazione -->
    <UCard>
      <template #header>
        <div class=\flex
items-center
justify-between\>
          <!-- Qui metteremo la data e i bottoni di navigazione -->
        </div>
      </template>
      
      <template #default>
        <!-- Qui metteremo la lista degli eventi -->
      </template>
    </UCard>
    
  </div>
</template>
`

**Spiegazione del codice:**

1. <template>: È la sezione che contiene l'HTML del componente
2. <div class=\...\>: Un contenitore principale con classi Tailwind per:
   - max-w-4xl: Larghezza massima di 80rem (circa 1280px)
   - mx-auto: Centra orizzontalmente il contenitore
   - px-4 sm:px-6 lg:px-8: Padding laterale che cambia in base alla dimensione dello schermo
   - py-8: Padding verticale di 2rem
3. <UCard>: Componente di @nuxt/ui che crea un card stilizzata con header, body e footer
4. #header: Slot personalizzato per l'intestazione della card
5. #default: Slot per il contenuto principale della card (il corpo)

### Passo 3.2: Aggiungere la Visualizzazione della Data

Sostituisci il commento nella sezione header con questo:

`html
<h2 class=\text-2xl
font-bold
text-gray-900\>
  {{ formattedSelectedDate }}
</h2>
`

Ma aspetta! Dobbiamo prima creare una variabile per formattare la data. Nel <script setup> aggiungi:

`javascript
// Calcola la data formattata usando la funzione del composable
const formattedSelectedDate = computed(() => {
  // Se selectedDate e null, usa la data odierna
  const dateToUse = selectedDate.value || new Date()
  
  // Usa la funzione formatDate dal composable
  return formatDate(dateToUse)
})
`

**Spiegazione di computed:**

- computed è una funzione di Vue che crea una proprieta calcolata
- Si ricomputa automaticamente quando le variabili su cui dipende cambiano
- È efficiente perché memorizza il risultato e lo ricalcola solo quando necessario

**Analogia:** Immagina computed come un calcolo automatico in Excel:
- Se cambi il valore di una cella, tutti i calcoli che dipendono da quella cella si aggiornano automaticamente
- Non devi riscrivere la formula ogni volta
- Vue fa tutto per te

### Passo 3.3: Aggiungere i Bottoni di Navigazione

Aggiungi questi bottoni accanto alla data:

`html
<div class=\flex
items-center
gap-4\>
  <!-- Bottoni di navigazione -->
  <UButton
    icon=\heroicons:arrow-left\
    color=\gray\
    variant=\ghost\
    :disabled=\isOnFirstDay\
    @click=\goToPreviousDay\
  >
    Indietro
  </UButton>
  
  <UButton
    icon=\heroicons:arrow-right\
    color=\gray\
    variant=\ghost\
    :disabled=\isOnLastDay\
    @click=\goToNextDay\
  >
    Avanti
  </UButton>
</div>
`

**Spiegazione dei componenti UButton:**

- icon: Nome dell'icona da usare (dal pacchetto Heroicons)
- color: Colore del bottone (gray, blue, red, ecc.)
- variant: Stile del bottone (ghost = trasparente con bordo, solid = pieno)
- :disabled: Disabilita il bottone se la condizione e true
- @click: Evento che viene eseguito quando clicchi sul bottone

**Nota sulle icone:** Usiamo heroicons:* perche @nuxt/ui integra Heroicons, una libreria di icone gratuite e bellissime. Puoi trovare altre icone su https://heroicons.com

### Passo 3.4: Completare l'Header Completo

L'header completo dovrebbe apparire così:

`html
<UCard>
  <template #header>
    <div class=\flex
flex-col
sm:flex-row
sm:items-center
sm:justify-between
gap-4\>
      <!-- Data -->
      <h2 class=\text-2xl
font-bold
text-gray-900\>
        {{ formattedSelectedDate }}
      </h2>
      
      <!-- Bottoni di navigazione -->
      <div class=\flex
items-center
gap-4\>
        <UButton
          icon=\heroicons:arrow-left\
          color=\gray\
          variant=\ghost\
          :disabled=\isOnFirstDay\
          @click=\goToPreviousDay\
        >
          Indietro
        </UButton>
        
        <UButton
          icon=\heroicons:arrow-right\
          color=\gray\
          variant=\ghost\
          :disabled=\isOnLastDay\
          @click=\goToNextDay\
        >
          Avanti
        </UButton>
      </div>
    </div>
  </template>
  
  <!-- Corpo della card (contenuto principale) -->
  <template #default>
    <!-- Qui andranno gli eventi o gli stati speciali -->
  </template>
</UCard>
`

**Spiegazione delle classi Tailwind:**

- flex: Attiva Flexbox (layout flessibile)
- flex-col sm:flex-row: Colonna su mobile, riga su schermi medio/grandi
- items-center: Allinea gli elementi al centro verticalmente
- justify-between: Distribuisce gli elementi con spazio uguale tra loro
- gap-4: Spazio di 1rem tra gli elementi
- sm:: Prefisso che rende la classe valida solo su schermi medio/grandi (>=640px)

---

## Parte 4: Implementare la Logica di Navigazione

Ora implementiamo la logica per spostarsi tra le date.

### Passo 4.1: Creare le Variabili di Stato

Nel <script setup>, aggiungi queste variabili:

`javascript
<script setup>
// Importa computed da Vue per creare proprieta calcolate
import { computed } from 'vue'

// Chiamata al composable useCalendarEvents
const {
  events,
  selectedDate,
  fetchState,
  errorMessage,
  isLoading,
  hasError,
  hasSuccess,
  hasEvents,
  fetchAllEvents,
  formatTime,
  formatDate,
} = useCalendarEvents()

// State locale per tracciare la data corrente visualizzata
const currentDisplayDate = ref(new Date())

// State per tracciare se stiamo caricando durante la navigazione
const isNavigating = ref(false)
</script>
`

**Spiegazione:**

- currentDisplayDate: Tiene traccia della data che stiamo visualizzando
  - Inizialmente impostata a new Date() (data odierna)
  - Cambia quando l'utente clicca sui bottoni di navigazione
  - È un ref, quindi e reattivo (cambiamenti automatici nell'UI)

- isNavigating: Indica se stiamo navigando tra le date
  - Utile per disabilitare i bottoni durante il caricamento
  - Evita che l'utente clicchi troppo velocemente

### Passo 4.2: Creare le Funzioni di Navigazione

Aggiungi queste due funzioni:

`javascript
// Funzione per andare al giorno precedente
const goToPreviousDay = async () => {
  if (isNavigating.value) return // Evita multipli click
  
  // Imposta stato di navigazione
  isNavigating.value = true
  
  try {
    // Decrementa di un giorno
    const previousDay = new Date(currentDisplayDate.value)
    previousDay.setDate(previousDay.getDate() - 1)
    
    // Aggiorna la data corrente
    currentDisplayDate.value = previousDay
    
    // Ricarica gli eventi per la nuova data
    await loadEventsForCurrentDate()
  } catch (error) {
    console.error('Errore nel movimento al giorno precedente:', error)
  } finally {
    isNavigating.value = false
  }
}

// Funzione per andare al giorno successivo
const goToNextDay = async () => {
  if (isNavigating.value) return // Evita multipli click
  
  // Imposta stato di navigazione
  isNavigating.value = true
  
  try {
    // Incrementa di un giorno
    const nextDay = new Date(currentDisplayDate.value)
    nextDay.setDate(nextDay.getDate() + 1)
    
    // Aggiorna la data corrente
    currentDisplayDate.value = nextDay
    
    // Ricarica gli eventi per la nuova data
    await loadEventsForCurrentDate()
  } catch (error) {
    console.error('Errore nel movimento al giorno successivo:', error)
  } finally {
    isNavigating.value = false
  }
}
`

**Spiegazione dettagliata:**

1. Controllo isNavigating: Prima di eseguire la navigazione, controlliamo se siamo gia in navigazione. Questo evita che l'utente clicchi piu volte velocemente e causi problemi.

2. Creazione della nuova data: 
   `javascript
   const previousDay = new Date(currentDisplayDate.value)
   `
   - Creiamo una nuova copia della data corrente
   - Importante: non modifichiamo currentDisplayDate.value direttamente, altrimenti potremmo avere effetti collaterali indesiderati

3. Modifica della data:
   `javascript
   previousDay.setDate(previousDay.getDate() - 1)
   `
   - getDate() restituisce il giorno del mese (1-31)
   - Sottraiamo 1 per andare al giorno precedente
   - JavaScript gestisce automaticamente i casi limite (es: se siamo al 1 marzo, andando indietro otteniamo 28 febbraio)

4. Aggiornamento della data corrente:
   `javascript
   currentDisplayDate.value = previousDay
   `
   - Assegniamo la nuova data alla variabile reattiva
   - Questo fara aggiornare automaticamente formattedSelectedDate nel template

5. Caricamento degli eventi:
   `javascript
   await loadEventsForCurrentDate()
   `
   - Chiama la funzione che recupera gli eventi per la nuova data
   - await significa aspetta che questa funzione finisca prima di continuare

6. Gestione errori con try/catch/finally:
   - try: Codice che potrebbe fallire
   - catch: Cosa fare se qualcosa va storto
   - finally: Cosa fare sempre, anche se c'e stato un errore (qui resettiamo isNavigating)

### Passo 4.3: Creare la Funzione di Caricamento Eventi

Crea questa funzione helper:

`javascript
// Funzione per caricare gli eventi per la data corrente
const loadEventsForCurrentDate = async () => {
  // Verifica se siamo autenticati
  if (!isAuthenticated.value) {
    errorMessage.value = 'Devi accedere per visualizzare gli eventi'
    fetchState.value = 'error'
    return
  }
  
  // Verifica se ci sono calendari configurati
  if (calendars.value.length === 0) {
    errorMessage.value = 'Nessun calendario configurato. Vai nelle impostazioni.'
    fetchState.value = 'error'
    return
  }
  
  // Chiama fetchAllEvents con i parametri corretti
  try {
    await fetchAllEvents({
      date: currentDisplayDate.value,
      calendars: calendars.value,
      token: user.value?.accessToken,
    })
    
    console.log('Eventi caricati con successo per:', currentDisplayDate.value.toLocaleDateString('it-IT'))
  } catch (error) {
    console.error('Errore nel caricamento eventi:', error)
    // L'errore viene gestito automaticamente dal composable
  }
}
`

**Spiegazione:**

Questa funzione e il ponte tra la nostra UI e il composable useCalendarEvents:

1. Controlli preliminari:
   - Verifica che l'utente sia autenticato
   - Verifica che ci siano calendari configurati
   - Se manca qualcosa, mostra un errore appropriato

2. Chiamata a fetchAllEvents:
   - Passa tre parametri:
     - date: La data corrente visualizzata
     - calendars: La lista di calendari dall'autenticazione
     - token: Il token OAuth2 dall'utente autenticato

3. Gestione errori:
   - Il composable gestisce automaticamente gli errori interni
   - Noi possiamo solo loggarli per debug

### Passo 4.4: Caricare gli Eventi all'Avvio

Aggiungi questo hook per caricare gli eventi quando la pagina viene aperta:

`javascript
// Carica gli eventi all'avvio della pagina
onMounted(async () => {
  console.log('Dashboard montata, caricamento eventi...')
  await loadEventsForCurrentDate()
})
`

**Spiegazione di onMounted:**

- onMounted e un hook di Vue che viene eseguito una sola volta quando il componente viene aggiunto alla pagina
- È il momento perfetto per fare operazioni iniziali come:
  - Caricare dati
  - Iniziare subscription
  - Fare chiamate API

**Analogia:** Immagina onMounted come l'inizio di una giornata lavorativa:
- Al mattino apri il computer (montaggio del componente)
- Carichi i tuoi file di lavoro (caricamento dati)
- Sei pronto a iniziare a lavorare

### Passo 6.5: Funzioni Helper per Colori e Nomi

Aggiungi queste funzioni per gestire colori e nomi dei calendari:

`javascript
// Mappa ID calendario → colore (puoi personalizzare i colori)
const calendarColorMap = {
  'primary': '#4285F4', // Blu Google
  // Aggiungi altri colori per i tuoi calendari
}

// Ottieni il colore per un calendario
const getCalendarColor = (calendarId) => {
  if (calendarColorMap[calendarId]) {
    return calendarColorMap[calendarId]
  }
  
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
  const index = calendarId.hashCode() % colors.length
  return colors[index]
}

// Ottieni il nome visualizzato per un calendario
const getCalendarName = (calendarId) => {
  const calendar = calendars.value.find(c => c.id === calendarId)
  return calendar?.displayName || calendar?.id || 'Calendario sconosciuto'
}

// Funzione per troncare il testo
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Estensione per calcolare hash di una stringa
String.prototype.hashCode = function() {
  let hash = 0
  const str = this.toString()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}
`

**Spiegazione:**

1. calendarColorMap: Oggetto che mappa ID calendario a colori specifici
   - Puoi personalizzare i colori per i tuoi calendari principali
   - Es: primary → blu Google, work → verde, ecc.

2. getCalendarColor: Funzione che cerca un colore specifico o genera un colore basato sull'ID

3. getCalendarName: Cerca il nome visualizzato nel config dei calendari

4. truncateText: Taglia il testo lungo per evitare che occupi troppo spazio

5. hashCode: Estensione di Stringa per calcolare un hash numerico

### Passo 6.5: Funzioni Helper per Colori e Nomi

Aggiungi queste funzioni per gestire colori e nomi dei calendari:

`javascript
// Mappa ID calendario → colore (puoi personalizzare i colori)
const calendarColorMap = {
  'primary': '#4285F4', // Blu Google
  // Aggiungi altri colori per i tuoi calendari
}

// Ottieni il colore per un calendario
const getCalendarColor = (calendarId) => {
  if (calendarColorMap[calendarId]) {
    return calendarColorMap[calendarId]
  }
  
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
  const index = calendarId.hashCode() % colors.length
  return colors[index]
}

// Ottieni il nome visualizzato per un calendario
const getCalendarName = (calendarId) => {
  const calendar = calendars.value.find(c => c.id === calendarId)
  return calendar?.displayName || calendar?.id || 'Calendario sconosciuto'
}

// Funzione per troncare il testo
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Estensione per calcolare hash di una stringa
String.prototype.hashCode = function() {
  let hash = 0
  const str = this.toString()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}
`

**Spiegazione:**

1. calendarColorMap: Oggetto che mappa ID calendario a colori specifici
   - Puoi personalizzare i colori per i tuoi calendari principali
   - Es: primary → blu Google, work → verde, ecc.

2. getCalendarColor: Funzione che cerca un colore specifico o genera un colore basato sull'ID

3. getCalendarName: Cerca il nome visualizzato nel config dei calendari

4. truncateText: Taglia il testo lungo per evitare che occupi troppo spazio

5. hashCode: Estensione di Stringa per calcolare un hash numerico

---

## Parte 7: Configurazione Completa del Script

Ora uniamo tutto nello script completo. Ecco il file completo pages/dashboard.vue con tutto il codice riunito.

**File da creare:** pages/dashboard.vue

Il file completo include:
1. Template con tutti gli stati (loading, error, empty, success)
2. Script setup con tutte le funzioni e computed properties
3. Integrazione completa con useCalendarEvents composable

Segui il piano passo-passo per costruire il file completo.

---

## Parte 8: Testing e Debug

### Passo 8.1: Testare la Pagina

Una volta creato il file, testa la pagina seguendo questi passaggi:

1. **Avvia il server di sviluppo**:
   npm run dev

2. **Apri il browser** e vai a http://localhost:3000/dashboard

3. **Verifica questi comportamenti:**
   - La data odierna viene mostrata correttamente
   - I bottoni Indietro e Avanti funzionano
   - Gli eventi vengono caricati automaticamente
   - Lo spinner appare mentre gli eventi vengono caricati
   - Gli eventi vengono mostrati in ordine cronologico
   - I bottoni di navigazione si disabilitano ai limiti

### Passo 8.2: Debug degli Errori Comuni

**Problema: Nessun evento caricato**

**Cause possibili:**
1. Non sei autenticato con Google
2. Nessun calendario configurato
3. Token OAuth2 scaduto

**Soluzione:**
- Vai alla pagina /settings
- Clicca Sign In with Google
- Aggiungi almeno un calendario con un Calendar ID valido
- Torna alla Dashboard

**Problema: Errore di caricamento**

**Cause possibili:**
1. Problema di rete
2. Token OAuth2 non valido
3. Calendario non trovato

**Soluzione:**
- Apri la console del browser (F12)
- Leggi i messaggi di errore
- Controlla che il token sia valido in /settings

**Problema: Data non si aggiorna**

**Cause possibili:**
1. Reattività Vue non funziona correttamente
2. currentDisplayDate non è un ref

**Soluzione:**
- Verifica che currentDisplayDate sia creato con ref()
- Controlla che formattedSelectedDate sia creato con computed()

### Passo 8.3: Strumenti di Debug

Usa questi strumenti per debuggare:

1. **Console del browser (F12)**:
   - Guarda i log che abbiamo aggiunto con console.log()
   - Vedi errori e warning

2. **DevTools di Vue**:
   - Estensione Chrome Vue.js devtools
   - Ti permette di vedere lo stato reattivo in tempo reale
   - Vedi quali computed properties si stanno aggiornando

3. **Network Tab**:
   - Vedi le chiamate API fatte all'API di Google
   - Controlla tempi di risposta e errori HTTP

---

## Parte 7: Configurazione Completa del Script

Ora uniamo tutto nello script completo. Ecco il file completo pages/dashboard.vue con tutto il codice riunito.

**File da creare:** pages/dashboard.vue

Il file completo include:
1. Template con tutti gli stati (loading, error, empty, success)
2. Script setup con tutte le funzioni e computed properties
3. Integrazione completa con useCalendarEvents composable

Segui il piano passo-passo per costruire il file completo.

---

## Parte 8: Testing e Debug

### Passo 8.1: Testare la Pagina

Una volta creato il file, testa la pagina seguendo questi passaggi:

1. **Avvia il server di sviluppo**:
   npm run dev

2. **Apri il browser** e vai a http://localhost:3000/dashboard

3. **Verifica questi comportamenti:**
   - La data odierna viene mostrata correttamente
   - I bottoni Indietro e Avanti funzionano
   - Gli eventi vengono caricati automaticamente
   - Lo spinner appare mentre gli eventi vengono caricati
   - Gli eventi vengono mostrati in ordine cronologico
   - I bottoni di navigazione si disabilitano ai limiti

### Passo 8.2: Debug degli Errori Comuni

**Problema: Nessun evento caricato**

**Cause possibili:**
1. Non sei autenticato con Google
2. Nessun calendario configurato
3. Token OAuth2 scaduto

**Soluzione:**
- Vai alla pagina /settings
- Clicca Sign In with Google
- Aggiungi almeno un calendario con un Calendar ID valido
- Torna alla Dashboard

**Problema: Errore di caricamento**

**Cause possibili:**
1. Problema di rete
2. Token OAuth2 non valido
3. Calendario non trovato

**Soluzione:**
- Apri la console del browser (F12)
- Leggi i messaggi di errore
- Controlla che il token sia valido in /settings

**Problema: Data non si aggiorna**

**Cause possibili:**
1. Reattività Vue non funziona correttamente
2. currentDisplayDate non è un ref

**Soluzione:**
- Verifica che currentDisplayDate sia creato con ref()
- Controlla che formattedSelectedDate sia creato con computed()

### Passo 8.3: Strumenti di Debug

Usa questi strumenti per debuggare:

1. **Console del browser (F12)**:
   - Guarda i log che abbiamo aggiunto con console.log()
   - Vedi errori e warning

2. **DevTools di Vue**:
   - Estensione Chrome Vue.js devtools
   - Ti permette di vedere lo stato reattivo in tempo reale
   - Vedi quali computed properties si stanno aggiornando

3. **Network Tab**:
   - Vedi le chiamate API fatte all'API di Google
   - Controlla tempi di risposta e errori HTTP

---

## Parte 9: Best Practices e Suggerimenti

### Best Practices Applicate

Abbiamo seguito queste best practices durante l'implementazione:

1. **Separazione delle responsabilità:**
   - Template: solo HTML e logica di visualizzazione
   - Script: solo logica e gestione dati
   - Composables: logica riutilizzabile

2. **Gestione degli errori:**
   - Ogni operazione asincrona ha un try/catch
   - Message di errore chiari per l'utente
   - Opzione per riprovare

3. **Stati ben definiti:**
   - Loading: spinner di caricamento
   - Error: messaggio di errore + bottone riprova
   - Empty: messaggio amichevole
   - Success: lista di eventi

4. **UX migliorata:**
   - Bottoni disabilitati quando non servono
   - Feedback visivo durante le operazioni
   - Navigazione intuitiva

5. **Codice mantenibile:**
   - Funzioni piccole e focalizzate
   - Commenti chiari
   - Naming significativo

### Suggerimenti per Estensioni Future

Ecco alcune idee per migliorare ulteriormente la Dashboard:

1. **Task 7 CalendarEventCard:**
   - Crea un componente separato CalendarEventCard.vue
   - Estrai il blocco HTML di ogni evento in un componente
   - Passa l'evento come prop

2. **Task 8 Date Navigation Controls:**
   - Aggiungi un picker date (calendario visivo)
   - Permetti di selezionare una data specifica
   - Aggiungi indicatori visivi per giorni con eventi

3. **Filtri e ordinamento:**
   - Filtra eventi per tipo (tutti, lavoro, personale)
   - Ordina per titolo invece che per ora
   - Cerca eventi per parola chiave

4. **Dettagli evento:**
   - Cliccando su un evento, mostra tutti i dettagli
   - Link all'evento originale su Google Calendar
   - Opzione per aggiungere alle proprie notifiche

5. **Dark mode:**
   - Usa le classi dark: di Tailwind CSS
   - Rispetta le preferenze del sistema operativo

---

## Parte 9: Best Practices e Suggerimenti

### Best Practices Applicate

Abbiamo seguito queste best practices durante l'implementazione:

1. **Separazione delle responsabilità:**
   - Template: solo HTML e logica di visualizzazione
   - Script: solo logica e gestione dati
   - Composables: logica riutilizzabile

2. **Gestione degli errori:**
   - Ogni operazione asincrona ha un try/catch
   - Message di errore chiari per l'utente
   - Opzione per riprovare

3. **Stati ben definiti:**
   - Loading: spinner di caricamento
   - Error: messaggio di errore + bottone riprova
   - Empty: messaggio amichevole
   - Success: lista di eventi

4. **UX migliorata:**
   - Bottoni disabilitati quando non servono
   - Feedback visivo durante le operazioni
   - Navigazione intuitiva

5. **Codice mantenibile:**
   - Funzioni piccole e focalizzate
   - Commenti chiari
   - Naming significativo

### Suggerimenti per Estensioni Future

Ecco alcune idee per migliorare ulteriormente la Dashboard:

1. **Task 7 CalendarEventCard:**
   - Crea un componente separato CalendarEventCard.vue
   - Estrai il blocco HTML di ogni evento in un componente
   - Passa l'evento come prop

2. **Task 8 Date Navigation Controls:**
   - Aggiungi un picker date (calendario visivo)
   - Permetti di selezionare una data specifica
   - Aggiungi indicatori visivi per giorni con eventi

3. **Filtri e ordinamento:**
   - Filtra eventi per tipo (tutti, lavoro, personale)
   - Ordina per titolo invece che per ora
   - Cerca eventi per parola chiave

4. **Dettagli evento:**
   - Cliccando su un evento, mostra tutti i dettagli
   - Link all'evento originale su Google Calendar
   - Opzione per aggiungere alle proprie notifiche

5. **Dark mode:**
   - Usa le classi dark: di Tailwind CSS
   - Rispetta le preferenze del sistema operativo

---

## Checklist Finale

Prima di considerare la Task 6 completata, verifica questi punti:

- [ ] File pages/dashboard.vue creato
- [ ] Link alla Dashboard aggiunto nella navigazione
- [ ] Data corrente visualizzata correttamente
- [ ] Bottoni di navigazione funzionano (indietro/avanti)
- [ ] Bottoni si disabilitano ai limiti di data
- [ ] Spinner di caricamento appare durante il fetch
- [ ] Messaggio di errore appare quando c'è un errore
- [ ] Bottone Riprova funziona
- [ ] Messaggio Nessun evento appare quando non ci sono eventi
- [ ] Lista di eventi appare quando ci sono eventi
- [ ] Event card mostra: titolo, orario, nome calendario, indicatore colore
- [ ] Event card mostra descrizione (troncata se lunga)
- [ ] Navigazione con tastiera (freccie sinistre/destra) funziona (opzionale)
- [ ] Responsive design funziona su mobile e desktop
- [ ] Console del browser non mostra errori

---

## Riepilogo Concetti Appresi

Durante questa task, hai imparato:

### Nuxt 3
- Routing automatico basato sulla struttura delle cartelle
- Componente <NuxtLink> per navigazione client-side
- Layout applicati automaticamente alle pagine

### Vue 3 Composition API
- Uso di ref() per dati reattivi
- Uso di computed() per proprietà calcolate
- Uso di onMounted() per inizializzazione
- De-strutturazione di composables

### @nuxt/ui
- Uso di UCard per container stilizzati
- Uso di UButton per bottoni pre-stilizzati
- Uso di Icon per icone integrate
- Slot personalizzati (#header, #default)

### Gestione Stati
- Stati di caricamento (loading)
- Stati di errore (error)
- Stati vuoti (empty)
- Stati di successo (success)

### Tailwind CSS
- Flexbox per layout
- Classi condizionali con :
- Classi responsive con sm:, lg:
- Animazioni con animate-spin

### JavaScript Moderno
- Async/await per operazioni asincrone
- Try/catch/finally per gestione errori
- Arrow functions
- Template literals
- Optional chaining (?.)
- Nullish coalescing (||)

---

## Prossimi Passi

Una volta completata la Task 6, le prossime task saranno:

1. **Task 7**: Creare componente CalendarEventCard.vue per rendere il codice più riutilizzabile
2. **Task 8**: Aggiungere controlli di navigazione avanzati (picker date, indicatori)
3. **Task 9**: Configurare file environment (.env.example)
4. **Task 10**: Scrivere test unitari e di integrazione
5. **Task 11**: Aggiornare documentazione
6. **Task 12**: Deploy in produzione

---

## Conclusione

Hai appena creato la tua prima pagina completa in Nuxt 3! Questa pagina dimostra:

- Come integrare composables esistenti
- Come gestire stati asincroni
- Come creare interfacce reattive
- Come gestire errori ed edge cases

Ora hai le basi per creare altre pagine simili. Buon coding!

---

## Checklist Finale

Prima di considerare la Task 6 completata, verifica questi punti:

- [ ] File pages/dashboard.vue creato
- [ ] Link alla Dashboard aggiunto nella navigazione
- [ ] Data corrente visualizzata correttamente
- [ ] Bottoni di navigazione funzionano (indietro/avanti)
- [ ] Bottoni si disabilitano ai limiti di data
- [ ] Spinner di caricamento appare durante il fetch
- [ ] Messaggio di errore appare quando c'è un errore
- [ ] Bottone Riprova funziona
- [ ] Messaggio Nessun evento appare quando non ci sono eventi
- [ ] Lista di eventi appare quando ci sono eventi
- [ ] Event card mostra: titolo, orario, nome calendario, indicatore colore
- [ ] Event card mostra descrizione (troncata se lunga)
- [ ] Navigazione con tastiera (freccie sinistre/destra) funziona (opzionale)
- [ ] Responsive design funziona su mobile e desktop
- [ ] Console del browser non mostra errori

---

## Riepilogo Concetti Appresi

Durante questa task, hai imparato:

### Nuxt 3
- Routing automatico basato sulla struttura delle cartelle
- Componente <NuxtLink> per navigazione client-side
- Layout applicati automaticamente alle pagine

### Vue 3 Composition API
- Uso di ref() per dati reattivi
- Uso di computed() per proprietà calcolate
- Uso di onMounted() per inizializzazione
- De-strutturazione di composables

### @nuxt/ui
- Uso di UCard per container stilizzati
- Uso di UButton per bottoni pre-stilizzati
- Uso di Icon per icone integrate
- Slot personalizzati (#header, #default)

### Gestione Stati
- Stati di caricamento (loading)
- Stati di errore (error)
- Stati vuoti (empty)
- Stati di successo (success)

### Tailwind CSS
- Flexbox per layout
- Classi condizionali con :
- Classi responsive con sm:, lg:
- Animazioni con animate-spin

### JavaScript Moderno
- Async/await per operazioni asincrone
- Try/catch/finally per gestione errori
- Arrow functions
- Template literals
- Optional chaining (?.)
- Nullish coalescing (||)

---

## Prossimi Passi

Una volta completata la Task 6, le prossime task saranno:

1. **Task 7**: Creare componente CalendarEventCard.vue per rendere il codice più riutilizzabile
2. **Task 8**: Aggiungere controlli di navigazione avanzati (picker date, indicatori)
3. **Task 9**: Configurare file environment (.env.example)
4. **Task 10**: Scrivere test unitari e di integrazione
5. **Task 11**: Aggiornare documentazione
6. **Task 12**: Deploy in produzione

---

## Conclusione

Hai appena creato la tua prima pagina completa in Nuxt 3! Questa pagina dimostra:

- Come integrare composables esistenti
- Come gestire stati asincroni
- Come creare interfacce reattive
- Come gestire errori ed edge cases

Ora hai le basi per creare altre pagine simili. Buon coding!
