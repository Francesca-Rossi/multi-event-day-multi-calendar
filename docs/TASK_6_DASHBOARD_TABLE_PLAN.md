# Task 6: Dashboard Page - Tabella Oraria Giornaliera

Questa task crea la pagina **Dashboard** (/dashboard) che mostra gli eventi di tutti i calendari configurati in una **tabella oraria**, non in una lista verticale.

---

## Obiettivi della Task

Creare una dashboard con:
1. **Tabella oraria giornaliera** con righe fisse dalle 08:00 alle 20:00
2. **Colonne dinamiche** per ogni calendario configurato
3. **Eventi mappati sulle celle** della tabella
4. **Header** con data odierna e link alle impostazioni
5. **Gestione stati** (loading, errori, vuoto)

**Importante**: La dashboard mostra SOLO la data odierna (NESSUNA navigazione date nella v1).

---

## Specifiche dal SPEC.md

### Layout della Tabella Oraria (righe 67-85)

| Ora   | [Nome Cal 1] | [Nome Cal 2] | [Nome Cal 3] |
|-------|--------------|--------------|--------------|
| 08:00 | Yoga         |      —       |      —       |
| 09:00 | Yoga         |      —       | Ginnastica   |
| 10:00 |      —       |      —       | Ginnastica   |
| ...   | ...          | ...          | ...          |
| 19:00 |      —       |      —       |      —       |

**Regole della tabella:**
- **Righe fisse**: 13 righe totali (08:00, 09:00, ..., 20:00)
- **Colonne**: Una per ogni calendario configurato nelle impostazioni
- **Cella evento**: Mostra il nome dell'evento se lo slot orario [start, end) include quell'ora
- **Cella vuota**: Mostra — quando non ci sono eventi
- **Data fissa**: Sempre oggi (nessun selettore o navigazione)

### Header (riga 90)

L'header deve contenere:
- **Data odierna** formattata in italiano
- **Link alle impostazioni** con icona per tornare alla pagina /settings

### Composable useCalendarEvents aggiornato (righe 190-194)

**PROBLEMA ATTUALE**: Il composable restituisce un array piatto di eventi.

**REQUISITO SPEC**: Deve restituire Map<calendarId, GoogleCalendarEvent[]>

Questo significa che invece di un array piatto come:

`	ypescript
const events = [
  { /* evento da calendario A */ },
  { /* evento da calendario B */ },
]
`

Dobbiamo restituire:

`	ypescript
const events = new Map([
  ['calendario_A_id', [{ /* evento */ }, { /* evento */ }]],
  ['calendario_B_id', [{ /* evento */ }]],
])
`

Questo permette di accedere facilmente agli eventi per ogni calendario quando costruiamo la tabella.

### Struttura File Consigliata (righe 198-219)

`
docs/
└── TASK_6_DASHBOARD_TABLE_PLAN.md

components/
├── CalendarTable.vue        # Tabella principale
├── CalendarCell.vue         # Singola cella della tabella
└── EventChip.vue            # Chip nome evento

pages/
└── dashboard.vue            # Pagina dashboard

composables/
└── useCalendarEvents.ts     # DA AGGIORNARE per restituire Map
`

---

## Piano di Implementazione Passo-Passo

---

## Fase 1: Aggiornare il Composable useCalendarEvents

### Problema Attuale

Il composable attuale restituisce un array piatto di eventi, ma la tabella ha bisogno di accedere agli eventi per ogni calendario separatamente.

### Soluzione: Restituire una Map<calendarId, GoogleCalendarEvent[]>

#### Modifica 1: Cambiare il tipo di ritorno

In composables/useCalendarEvents.ts:

`	ypescript
// PRIMA (array piatto - NON VA BENE PER LA TABELLA)
const events = ref<GoogleCalendarEvent[]>([])

// DOPO (Map per calendarId -> eventi)
const eventsByCalendar = ref<Map<string, GoogleCalendarEvent[]>>(new Map())
`

#### Modifica 2: Aggiornare fetchAllEvents()

La funzione deve costruire una Map invece di un array piatto:

`	ypescript
async function fetchAllEvents(params) {
  const { date, calendars, token } = params
  
  try {
    setFetchState('loading')
    const timeRange = getTimeRangeForDate(date)
    
    const promises = calendars.map(calendar =>
      fetchCalendarEvents(calendar.id, timeRange.startDateTime, timeRange.endDateTime, token)
    )
    
    const results = await Promise.allSettled(promises)
    
    // Costruisci MAPPA
    const map = new Map()
    results.forEach((result, index) => {
      const calendar = calendars[index]
      if (result.status === 'fulfilled') {
        map.set(calendar.id, result.value)
      } else {
        map.set(calendar.id, [])
        console.warn(Errore fetch calendario :, result.reason)
      }
    })
    
    eventsByCalendar.value = map
    selectedDate.value = date
    setFetchState('success')
    return { events: [], error: null, fetchState: 'success' }
  } catch (error) {
    setFetchState('error', error.message)
    return { events: [], error, fetchState: 'error' }
  }
}
`

#### Modifica 3: Aggiornare l'export

`	ypescript
export function useCalendarEvents() {
  return {
    eventsByCalendar,  // INVECE DI: events
    selectedDate,
    fetchState,
    errorMessage,
    isLoading,
    hasError,
    hasSuccess,
    hasEvents,
    fetchAllEvents,
    fetchEventsForDate,
    fetchTodayEvents,
    formatTime,
    formatDate,
  }
}
`

#### Modifica 4: Aggiornare computed hasEvents

`	ypescript
const hasEvents = computed(() => {
  for (const [, calendarEvents] of eventsByCalendar.value.entries()) {
    if (calendarEvents.length > 0) return true
  }
  return false
})
`

### Spiegazione: Cos'e' una Map?

Una **Map** e' come un oggetto JavaScript, ma piu' facile da usare con chiavi dinamiche.

`javascript
// Oggetto normale
const eventi = {
  'cal_id_1': [{/* evento */}],
  'cal_id_2': [{/* evento */}]
}

// Map (piu' sicuro)
const eventi = new Map([
  ['cal_id_1', [{/* evento */}]],
  ['cal_id_2', [{/* evento */}]]
])

// Accedere
const eventiCal1 = eventi.get('cal_id_1')

// Verificare
if (eventi.has('cal_id_1')) {
  console.log('Presente')
}
`

**Perche' usare Map?**
1. Mantiene l'ordine di inserimento
2. Piu' performante
3. API chiara (get, set, has, entries)
4. Nessun problema con chiavi speciali

---

## Fase 2: Creare il Componente EventChip

### Scopo del Componente

EventChip.vue e' un piccolo componente che mostra il nome di un evento in un "chip" colorato all'interno di una cella della tabella.

### Struttura del Componente

Crea il file components/EventChip.vue:

`ue
<script setup lang="ts">
interface Props {
  eventName: string
  backgroundColor?: string
  textColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  backgroundColor: 'bg-blue-500',
  textColor: 'text-white',
})

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <div
    class="inline-flex items-center px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors"
    :class="[backgroundColor, textColor]"
    @click="('click', )"
    :title="eventName"
  >
    {{ eventName }}
  </div>
</template>
`

**Props:**
- eventName: Il nome dell'evento (obbligatorio)
- backgroundColor: Colore di sfondo (default: blue-500)
- textColor: Colore del testo (default: white)

**Stili:**
- inline-flex: Permette al chip di adattarsi al contenuto
- px-2 py-1: Padding piccolo per mantenere il chip compatto
- rounded: Angoli arrotondati
- text-xs: Testo piccolo (adatto a una cella)
- cursor-pointer: Indica che e' cliccabile

### Come Usare EventChip

`ue
<EventChip eventName="Yoga Class" />
<EventChip eventName="Meeting" backgroundColor="bg-purple-500" />
<EventChip eventName="Appuntamento" @click="handleClick" />
`

---

## Fase 3: Creare il Componente CalendarCell

### Scopo del Componente

CalendarCell.vue rappresenta una singola cella nella tabella oraria. Ogni cella corrisponde a un incrocio tra:
- Una riga oraria (es: 09:00)
- Una colonna calendario (es: "Sala Conferenze")

La cella puo' mostrare:
1. Un evento (tramite EventChip)
2. Un trattino — se non ci sono eventi

### Struttura del Componente

Crea il file components/CalendarCell.vue:

`ue
<script setup lang="ts">
import EventChip from './EventChip.vue'

interface Props {
  hour: number
  events: GoogleCalendarEvent[]
  calendarId: string
}

const props = defineProps<Props>()

const activeEvent = computed(() => {
  const now = props.hour
  return props.events.find(event => {
    const startHour = new Date(event.start.dateTime || event.start.date).getHours()
    const endHour = new Date(event.end.dateTime || event.end.date).getHours()
    return startHour <= now && endHour > now
  }) || null
})
</script>

<template>
  <td class="border border-gray-200 p-2 align-top min-w-[150px]">
    <EventChip v-if="activeEvent" :event-name="activeEvent.summary" />
    <span v-else class="text-gray-400">—</span>
  </td>
</template>
`

### Logica di Mapping Eventi

Un evento e' attivo se: startHour <= hour < endHour

Esempi:
- Evento 09:00-10:00 → Attivo alle 09:00 ✓, Non attivo alle 10:00 ✗
- Evento 08:30-10:00 → Attivo alle 09:00 ✓
- Evento 10:00-11:00 → Non attivo alle 09:00 ✗, Attivo alle 10:00 ✓

**Perche' usare [start, end)?**
Se usassimo [start, end] (entrambi inclusi), un evento 09:00-10:00 sarebbe attivo sia alle 09:00 che alle 10:00, creando conflitti con eventi consecutivi.

---

## Fase 4: Creare il Componente CalendarTable

### Scopo del Componente

CalendarTable.vue coordina tutta la tabella oraria:
- Genera le righe orarie fisse (08:00 - 20:00)
- Genera le colonne dinamiche (una per calendario)
- Combina tutto con le celle individuali

### Struttura del Componente

Crea il file components/CalendarTable.vue:

`ue
<script setup lang="ts">
import CalendarCell from './CalendarCell.vue'

interface Props {
  calendars: CalendarEntry[]
  eventsByCalendar: Map<string, GoogleCalendarEvent[]>
  isLoading: boolean
  errorMessage?: string
}

const props = defineProps<Props>()

const START_HOUR = 8
const END_HOUR = 20

const hours = computed(() => {
  const result = []
  for (let h = START_HOUR; h <= END_HOUR; h++) result.push(h)
  return result
})
</script>

<template>
  <div class="w-full overflow-x-auto">
    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
    
    <!-- Tabella -->
    <table v-else class="min-w-full bg-white border-collapse">
      <thead>
        <tr class="bg-gray-100">
          <th class="sticky left-0 z-10 bg-gray-100 px-4 py-3 text-left">Ora</th>
          <th v-for="c in calendars" :key="c.id">{{ c.displayName }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in hours" :key="h" class="hover:bg-gray-50">
          <td class="sticky left-0 z-10 bg-white px-4 py-3">{{ String(h).padStart(2,'0') }}:00</td>
          <CalendarCell
            v-for="c in calendars"
            :key="${c.id}-"
            :hour="h"
            :events="eventsByCalendar.get(c.id) || []"
            :calendar-id="c.id"
          />
        </tr>
      </tbody>
    </table>
  </div>
</template>
`

**Note importanti:**
- START_HOUR = 8 e END_HOUR = 20: Righe fisse secondo SPEC
- hours computed genera [8, 9, 10, ..., 20] = 13 righe
- Sticky column: La colonna "Ora" rimane visibile durante lo scroll orizzontale
- Overflow-x-auto: Permette scroll orizzontale su schermi piccoli

---

## Fase 5: Creare la Pagina /dashboard.vue

### Scopo della Pagina

La pagina dashboard.vue coordina:
1. Il layout con header
2. La chiamata ai composables
3. Il rendering della tabella

### Struttura della Pagina

Crea il file pages/dashboard.vue:

`ue
<script setup lang="ts">
import CalendarTable from '~/components/CalendarTable.vue'

const { calendars } = useCalendarConfig()
const { accessToken, isAuthenticated, signIn } = useGoogleAuth()
const { eventsByCalendar, isLoading, hasError, errorMessage, fetchTodayEvents, formatDate } = useCalendarEvents()

const handleSignIn = async () => {
  await signIn()
}

watch(isAuthenticated, async (val) => {
  if (val && accessToken.value) {
    await fetchTodayEvents(calendars.value, accessToken.value)
  }
})

onMounted(() => {
  if (isAuthenticated.value && accessToken.value) {
    fetchTodayEvents(calendars.value, accessToken.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- HEADER -->
    <header class="bg-white shadow-sm border-b p-4 sticky top-0 z-20">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold">Dashboard - {{ formatDate(new Date()) }}</h1>
        <NuxtLink to="/settings" class="px-3 py-2 bg-gray-100 rounded-lg">Impostazioni ⚙️</NuxtLink>
      </div>
    </header>
    
    <!-- MAIN CONTENT -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <CalendarTable
        :calendars="calendars"
        :events-by-calendar="eventsByCalendar"
        :is-loading="isLoading"
        :error-message="hasError ? errorMessage : undefined"
      />
    </main>
  </div>
</template>
`

**Flusso di autenticazione:**
- watch(isAuthenticated) -> se true chiama fetchTodayEvents()
- onMounted() verifica se gia' autenticati e carica eventi

---

## Riepilogo dei File da Creare/Modificare

### File da CREARE:

`
components/
├── CalendarTable.vue  # Tabella principale
├── CalendarCell.vue   # Singola cella
└── EventChip.vue      # Chip evento

pages/
└── dashboard.vue      # Pagina dashboard
`

### File da MODIFICARE:

`
composables/
└── useCalendarEvents.ts  # Cambia events -> eventsByCalendar (tipo Map)
`

---

## Checklist di Testing

### Test Funzionali

- [ ] Login Flow: Utente vede login screen, clicca "Accedi", dashboard si carica automaticamente
- [ ] Tabella Oraria: Sono presenti esattamente 13 righe (08:00 - 20:00)
- [ ] Colonne: Le colonne corrispondono ai calendari configurati
- [ ] Eventi: Gli eventi appaiono nelle celle corrette
- [ ] Celle vuote: Mostrano —
- [ ] Mapping Eventi: Evento 09:00-10:00 appare alle 09:00, NON alle 10:00
- [ ] Gestione Errori: Calendario con errore 403 mostra colonna vuota (non crasha)
- [ ] Loading State: Spinner visibile durante il fetch

### Test di Usabilita'

- [ ] Responsive: Su tablet landscape, la tabella e' leggibile
- [ ] Scroll: Su mobile, compare scroll orizzontale
- [ ] Sticky Column: La colonna "Ora" rimane visibile durante lo scroll
- [ ] Navigazione: Link "Impostazioni" (⚙️) porta a /settings

### Test Edge Case

- [ ] Nessun calendario: Messaggio informativo mostrato
- [ ] Calendari senza eventi: Tutte le celle mostrano —
- [ ] Eventi fuori orario: Evento 07:00-08:00 NON appare (prima dell'orario tabella)

---

## Best Practices Seguite

1. **Separazione delle Responsabilita'**: Ogni componente ha UN solo scopo
2. **Tipizzazione Completa**: Tutte le funzioni hanno tipi TypeScript definiti
3. **Gestione Errori Robusta**: Try/catch ovunque, Promise.allSettled per non bloccare tutto
4. **Reattivita' Vue**: Uso corretto di ref(), computed(), watch(), props e emits tipizzati
5. **Documentazione Interna**: JSDoc comments sopra le funzioni, commenti inline per logica complessa

---

## Conclusione

Questa task completa la creazione della dashboard principale dell'applicazione. Seguendo questo piano passo-passo, anche un principiante puo' capire:

1. Come strutturare una tabella complessa con componenti riutilizzabili
2. Come mappare dati relazionali (eventi -> calendari -> celle)
3. Come gestire stati asincroni (loading, errori, success)
4. Come seguire una SPEC tecnica mantenendo coerenza con il resto del progetto

Buona programmazione!

---

*Documento creato per guidare l'implementazione della Task 6 - Dashboard Page*
*Ultima revisione: Agosto 2025*
