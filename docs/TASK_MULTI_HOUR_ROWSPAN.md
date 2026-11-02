# Piano: Visualizzazione Eventi Multi-Ora — CSS Flex + Absolute Positioning

## 1. Diagnosi del Bug

### Problema fondamentale

Nelle tabelle HTML, `rowspan` è una proprietà **condivisa a livello di `<tr>`**. Quando una cella usa `rowspan`, le celle sulla stessa riga nelle altre colonne vengono spostate, disallineando le colonne successive.

Nell'implementazione precedente, `CalendarTable.vue` calcolava `renderableHours` che filtrava **globalmente** le ore da tutte le colonne quando *qualsiasi* calendario aveva un evento con `rowSpan > 1`:

```typescript
// BUG: rimuove ore dalla lista globale quando ANY calendario ha rowspan > 1
const renderableHours = computed(() => {
  for (const group of groupedCalendars.value) {
    for (const cal of group.calendars) {
      const spans = computeHourSpans(eventMap().get(cal.id) || [])
      for (const span of spans) {
        if (span.rowSpan > 1) {
          // ← Questo nasconde ore PER TUTTE LE COLONNE
          for (let i = span.startHour + 1; i < span.startHour + span.rowSpan; i++) {
            hoursToSkip.add(i)
          }
        }
      }
    }
  }
  return hours.value.filter(h => !hoursToSkip.has(h))
})
```

### Conseguenze

- Evento in "Digital Lab" dalle 08:00 alle 13:00 → ore 09-12 rimosse da `renderableHours` → **tutte le colonne** perdono quelle righe
- Eventi pomeridiani in "Co-working" o "Sala Radio" risultano sovrapposti o nascosti
- La colonna "Ora" perde fasce orarie → disallineamento totale

### Perché non si può fixare con `rowspan`

```html
<!-- IMPOSSIBILE: ogni <tr> ha lo stesso conteggio celle -->
<tr> <td rowspan="5">08:00</td> <td rowspan="5">Evento A</td> <td>Eventi B</td> </tr>
<!-- ↑ Questo richiede che tutte le colonne condividano lo stesso rowspan -->
```

Le tabelle HTML richiedono che ogni `<tr>` abbia lo stesso numero totale di colonne visibili. Non esiste "rowspan indipendente per colonna".

---

## 2. Soluzione: CSS Flex + Absolute Positioning

### Architettura

Abbandonare `<table>` e `<thead>`/`<tbody>`. Usare un layout a colonne:

```
+=====================================================================+
| Riga 1: Categorie  | Cat A (span 2 col) | Cat B | Senza categoria   |
| Riga 2: Calendari  | Cal 1 | Cal 2      | Cal 3 | Cal 4            |
+---------+----------+---------+-----------+-------+-------------------+
| Ora     | Cal 1    | Cal 2   | Cal 3     | Cal 4                    |
| 08:00   |          |         |           |                          |
| 09:00   | Evento A |         | Evento C  |                          |
| 10:00   | (tile 4h)|         | (tile 1h) |                          |
| 11:00   |          |         |           |                          |
| 12:00   |          |         |           |                          |
| 13:00   |          |         |           |                          |
| 14:00   |          | Evento B|           |                          |
| 15:00   |          | (tile 2h|           |                          |
| ...     |          |         |           |                          |
| 20:00   |          |         |           |                          |
+---------+----------+---------+-----------+-------------------+------+
```

- **Colonna "Ora"**: fissa, sticky left, mostra TUTTE le 13 fasce orarie
- **Colonne calendari**: indipendenti, ognuna gestisce i propri eventi
- **Eventi multi-ora**: tile `position: absolute` dentro la colonna del calendario
- **Ogni colonna** ha uno slot-grid statico (13 divisori) + overlay eventi

### Conversione Orario → Coordinate CSS

```
DAY_START_HOUR    = 8
DAY_END_HOUR      = 20
TOTAL_SLOTS       = 13 (08..20)
DAY_START_MINUTES = 480  (8 × 60)
DAY_END_MINUTES   = 1260 (21 × 60, perché lo slot 20:00 copre fino alle 21:00)
TOTAL_DAY_MINUTES = 780  (1260 - 480)
```

Per ogni evento con `startAt` e `endAt` (minuti dalla mezzanotte):

```
topPercent    = ((startTime - 480) / 780) × 100
heightPercent = ((endTime - startTime) / 780) × 100
```

Clamp ai limiti della griglia: se l'evento inizia prima delle 08:00, `topPercent = 0`. Se finisce dopo le 21:00, `heightPercent = 100 - topPercent`.

---

## 3. Interfacce e Tipi

### Interfacce esistenti (invariate)

```typescript
// types/calendar.ts — NESSUNA MODIFICA
interface CalendarEntry {
  id: string
  displayName: string
  category?: string
}

interface Category {
  id: string
  name: string
}

interface CalendarConfig {
  calendars: CalendarEntry[]
  categories: Category[]
}

interface GoogleCalendarEvent {
  id: string
  summary: string
  start: { dateTime: string; date?: string }
  end: { dateTime: string; date?: string }
}
```

### Nuove interfacce in CalendarTable.vue

```typescript
/**
 * Posizione calcolata di un evento nella griglia (in percentuali)
 */
interface EventPosition {
  /** Percentuale di top rispetto alla griglia (0–100) */
  top: string
  /** Percentuale di height rispetto alla griglia (min 2%) */
  height: string
  /** Indice della colonna nell'overlap group (per eventi sovrapposti) */
  colIndex: number
  /** Numero di colonne occupate (per eventi sovrapposti) */
  colSpan: number
}

/**
 * Evento con posizione calcolata, pronto per il rendering
 */
interface PositionedEvent {
  event: GoogleCalendarEvent
  position: EventPosition
}
```

---

## 4. Funzioni Helper

### 4.1 Costanti temporali

```typescript
const START_HOUR = 8
const END_HOUR = 20
const TOTAL_SLOTS = END_HOUR - START_HOUR + 1  // 13
const DAY_START_MINUTES = START_HOUR * 60      // 480
const DAY_END_MINUTES = (END_HOUR + 1) * 60    // 1260
const TOTAL_DAY_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES // 780
```

### 4.2 `parseEventDate(value: string): Date | null`

Riusata dal file esistente `useCalendarEvents.ts`. Gestisce il formato all-day (`YYYY-MM-DD`) vs orario (`YYYY-MM-DDTHH:mm:ss+ZZ:ZZ`).

```typescript
function parseEventDate(value: string | undefined): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}
```

### 4.3 `toMinutesFromMidnight(date: Date): number`

```typescript
function toMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}
```

### 4.4 `computeDuration(event: GoogleCalendarEvent): number`

> **⚠️ Rimosse (vedi §13):** `computeDuration`/`getDuration` e `formatDuration` non vengono più renderizzate nella tile. Al posto della durata ora compare il creatore e il range orario `[start]–[end]`.

```typescript
function computeDuration(event: GoogleCalendarEvent): number {
  const start = parseEventDate(event.start?.dateTime ?? event.start?.date)
  const end = parseEventDate(event.end?.dateTime ?? event.end?.date)
  if (!start || !end) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
}
```

### 4.5 `formatDuration(minutes: number): string`

```typescript
function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}m` : `${h}h`
  }
  return `${minutes}min`
}
```

### 4.6 `isAllDayEvent(event: GoogleCalendarEvent): boolean`

```typescript
function isAllDayEvent(event: GoogleCalendarEvent): boolean {
  return !!(event.start?.date && !event.start?.dateTime)
}
```

### 4.7 `positionFor(event: GoogleCalendarEvent): EventPosition`

Funzione principale per calcolare la posizione di un evento nella griglia.

```typescript
function positionFor(event: GoogleCalendarEvent): EventPosition {
  // All-day: copre tutta la griglia
  if (isAllDayEvent(event)) {
    return { top: '0%', height: '100%', colIndex: 0, colSpan: 1 }
  }

  const startStr = event.start?.dateTime ?? event.start?.date
  const endStr = event.end?.dateTime ?? event.end?.date
  if (!startStr || !endStr) {
    return { top: '0%', height: '100%', colIndex: 0, colSpan: 1 }
  }

  const start = new Date(startStr)
  const end = new Date(endStr)

  const startMin = toMinutesFromMidnight(start)
  const endMin = toMinutesFromMidnight(end)

  // Clamp ai limiti della griglia
  const clampedStartMin = Math.max(DAY_START_MINUTES, Math.min(startMin, DAY_END_MINUTES))
  const clampedEndMin = Math.max(clampedStartMin + 15, Math.min(endMin, DAY_END_MINUTES)) // minimo 15 min

  const topPct = ((clampedStartMin - DAY_START_MINUTES) / TOTAL_DAY_MINUTES) * 100
  const heightPct = ((clampedEndMin - clampedStartMin) / TOTAL_DAY_MINUTES) * 100

  return {
    top: `${Math.max(0, topPct).toFixed(2)}%`,
    height: `${Math.max(2, heightPct).toFixed(2)}%`, // min 2% per visibilità
    colIndex: 0,
    colSpan: 1,
  }
}
```

### 4.8 `getEventsForCalendar(calId: string): PositionedEvent[]`

Ottiene gli eventi di un calendario, risolve gli overlap e restituisce posizioni pronte per il rendering.

```typescript
function getEventsForCalendar(calId: string): PositionedEvent[] {
  const events = eventMap().get(calId) || []
  if (events.length === 0) return []

  // Calcola posizioni base
  const positioned: Array<GoogleCalendarEvent & { position: EventPosition }> = events.map(ev => ({
    ...ev,
    position: positionFor(ev),
  }))

  // Ordina per ora di inizio
  positioned.sort((a, b) => {
    const aStart = parseEventDate(a.start?.dateTime ?? a.start?.date)?.getTime() ?? 0
    const bStart = parseEventDate(b.start?.dateTime ?? b.start?.date)?.getTime() ?? 0
    return aStart - bStart
  })

  // Raggruppa eventi che si sovrappongono
  const groups: typeof positioned[] = []
  let i = 0
  while (i < positioned.length) {
    const group = [positioned[i]]
    let j = i + 1
    while (j < positioned.length && areOverlapping(positioned[i], positioned[j])) {
      group.push(positioned[j])
      j++
    }
    groups.push(group)
    i = j
  }

  // Per ogni gruppo, assegna colonne (bin packing greedy)
  const result: PositionedEvent[] = []
  for (const group of groups) {
    const columns: typeof group[] = []
    for (const ev of group) {
      let placed = false
      for (let c = 0; c < columns.length; c++) {
        if (!areOverlapping(columns[c][0], ev)) {
          columns[c].push(ev)
          ev.position = { ...ev.position, colIndex: c, colSpan: 1 }
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([ev])
        ev.position = { ...ev.position, colIndex: columns.length - 1, colSpan: 1 }
      }
    }

    // Assegna colSpan = numero totale colonne nel gruppo
    for (const ev of group) {
      ev.position = { ...ev.position, colSpan: columns.length }
    }

    result.push(...group.map(ev => ({ event: ev, position: ev.position })))
  }

  return result
}
```

### 4.9 `areOverlapping(a, b): boolean`

```typescript
function areOverlapping(a: GoogleCalendarEvent, b: GoogleCalendarEvent): boolean {
  const aStart = parseEventDate(a.start?.dateTime ?? a.start?.date)
  const aEnd = parseEventDate(a.end?.dateTime ?? a.end?.date)
  const bStart = parseEventDate(b.start?.dateTime ?? b.start?.date)
  const bEnd = parseEventDate(b.end?.dateTime ?? b.end?.date)

  if (!aStart || !aEnd || !bStart || !bEnd) return false

  return aStart < bEnd && bStart < aEnd
}
```

### 4.10 `getEventColor(event: GoogleCalendarEvent): string` e `getTextColor`

```typescript
const eventColors = [
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-green-500', text: 'text-white' },
  { bg: 'bg-purple-500', text: 'text-white' },
  { bg: 'bg-yellow-500', text: 'text-gray-900' },
  { bg: 'bg-red-500', text: 'text-white' },
  { bg: 'bg-teal-500', text: 'text-white' },
  { bg: 'bg-pink-500', text: 'text-white' },
  { bg: 'bg-indigo-500', text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
]

function getEventColor(event: GoogleCalendarEvent): string {
  const hash = hashCode(event.id ?? event.summary ?? 'unknown')
  const idx = Math.abs(hash) % eventColors.length
  return eventColors[idx].bg
}

function getTextColor(event: GoogleCalendarEvent): string {
  const hash = hashCode(event.id ?? event.summary ?? 'unknown')
  const idx = Math.abs(hash) % eventColors.length
  return eventColors[idx].text
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return hash
}
```

### 4.11 `flatCalendars`: lista piatta di calendari in ordine di categoria

```typescript
const flatCalendars = computed(() => {
  return groupedCalendars.value.flatMap(g => g.calendars)
})
```

---

## 5. Template

### Struttura generale

```vue
<template>
  <div class="w-full overflow-x-auto">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
      {{ errorMessage }}
    </div>

    <!-- Empty State -->
    <div v-else-if="calendars.length === 0" class="text-center py-12">
      <p class="text-gray-600 mb-2">Nessun calendario configurato</p>
      <p class="text-sm text-gray-500">Vai alle impostazioni per aggiungere calendari</p>
    </div>

    <!-- Griglia calendario -->
    <div v-else class="calendar-wrapper">
      <!-- RIGA 1: Categorie -->
      <div class="calendar-header flex">
        <div class="time-header-cell w-[70px] shrink-0 bg-gray-200 sticky left-0 z-20 border-b border-r border-gray-300"></div>
        <div
          v-for="group in groupedCalendars"
          :key="group.category?.id || `uncat-${group.calendars[0]?.id}`"
          class="category-header-cell bg-gray-200 px-2 py-1 text-center font-semibold border-r border-gray-300 last:border-r-0"
          :style="{ flexGrow: group.calendars.length, flexBasis: 0 }"
        >
          <span class="text-xs uppercase tracking-wide">
            {{ group.category?.name || 'Senza categoria' }}
          </span>
        </div>
      </div>

      <!-- RIGA 2: Nomi calendari -->
      <div class="calendar-header flex">
        <div class="time-header-cell w-[70px] shrink-0 bg-gray-100 sticky left-0 z-20 border-r border-gray-300"></div>
        <div
          v-for="c in flatCalendars"
          :key="c.id"
          class="cal-name-cell bg-gray-100 px-2 py-1 font-medium border-r border-gray-300 last:border-r-0"
          style="min-width: 180px;"
        >
          <span class="truncate block">{{ c.displayName || c.id }}</span>
          <span
            v-if="errors.get(c.id)"
            class="inline-flex items-center gap-1 text-xs font-medium text-red-700"
            :title="errors.get(c.id)"
          >
            ⚠ Errore accesso
          </span>
        </div>
      </div>

      <!-- CORPO: Colonna Ore + Colonne Calendari -->
      <div class="calendar-body flex">
        <!-- Colonna Ore (sticky left) -->
        <div class="time-column w-[70px] shrink-0 bg-white sticky left-0 z-10 border-r border-gray-300">
          <div
            v-for="h in hours"
            :key="h"
            class="time-slot-cell border-b border-gray-100 flex items-center justify-end pr-2 text-xs text-gray-500 font-medium"
          >
            {{ String(h).padStart(2, '0') }}:00
          </div>
        </div>

        <!-- Una colonna per ogni calendario -->
        <div
          v-for="c in flatCalendars"
          :key="c.id"
          class="calendar-column flex-1 min-w-[180px] border-r border-gray-200 last:border-r-0 relative"
        >
          <!-- Slot grid statico (divisori visivi) -->
          <div class="slot-grid absolute inset-0 flex flex-col">
            <div
              v-for="h in hours"
              :key="h"
              class="slot-divider flex-1 border-b border-gray-100"
            ></div>
          </div>

          <!-- Overlay eventi -->
          <div class="events-overlay absolute inset-0 pointer-events-none">
            <div
              v-for="pe in getEventsForCalendar(c.id)"
              :key="pe.event.id"
              class="event-tile absolute pointer-events-auto cursor-pointer rounded shadow-sm hover:brightness-110 transition-all overflow-hidden"
              :class="[getEventColor(pe.event), getTextColor(pe.event)]"
              :style="{
                top: pe.position.top,
                height: pe.position.height,
                left: `calc(${pe.position.colIndex} * (100% / ${pe.position.colSpan}) + 2px)`,
                width: `calc(100% / ${pe.position.colSpan} - 4px)`,
              }"
              :title="`${pe.event.summary}${creatorName(pe.event) ? ` — ${creatorName(pe.event)}` : ''} (${formatTimeRange(pe.event)})`"
            >
              <div class="flex flex-col items-center justify-center h-full px-1 py-0.5">
                <span class="font-medium text-[11px] leading-tight text-center line-clamp-2">
                  {{ pe.event.summary }}
                </span>
                <span
                  v-if="creatorName(pe.event)"
                  class="text-[9px] opacity-80 mt-0.5 truncate max-w-full"
                >
                  {{ creatorName(pe.event) }}
                </span>
                <span
                  v-if="!isAllDayEvent(pe.event) && formatTimeRange(pe.event)"
                  class="text-[9px] opacity-80"
                >
                  {{ formatTimeRange(pe.event) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Helper aggiuntivo per tooltip e tile

```typescript
function formatTimeRange(event: GoogleCalendarEvent): string {
  const startStr = event.start?.dateTime ?? event.start?.date
  const endStr = event.end?.dateTime ?? event.end?.date
  if (!startStr || !endStr) return ''
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${fmt(new Date(startStr))}–${fmt(new Date(endStr))}`
}

// Restituisce il nome da mostrare sotto al titolo: creator con fallback
// su organizer; displayName oppure local-part dell'email. '' se assente.
function creatorName(event: GoogleCalendarEvent): string {
  const person = event.creator ?? event.organizer
  if (person?.displayName) return person.displayName
  if (person?.email) return person.email.split('@')[0] ?? ''
  return ''
}
```

---

## 6. Stili CSS

### 6.1 Layout generale

```css
.calendar-wrapper {
  display: flex;
  flex-direction: column;
  min-width: fit-content;
}

.calendar-header {
  display: flex;
  align-items: stretch;
  min-width: fit-content;
}

.time-header-cell {
  display: flex;
  align-items: center;
}

.category-header-cell {
  text-align: center;
}

.cal-name-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 6.2 Corpo griglia

```css
.calendar-body {
  display: flex;
  align-items: stretch;
  min-width: fit-content;
}

.time-column {
  display: flex;
  flex-direction: column;
}

.time-slot-cell {
  height: 50px; /* altezza fissa per slot */
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}
```

### 6.3 Colonne calendari

```css
.calendar-column {
  position: relative;
  flex: 1;
  min-width: 180px;
}

.slot-grid {
  display: flex;
  flex-direction: column;
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.slot-divider {
  flex: 1;
  min-height: 50px; /* allineamento con time-slot-cell */
  border-bottom: 1px solid #f3f4f6;
}

.slot-divider:last-child {
  border-bottom: none;
}
```

### 6.4 Overlay eventi

```css
.events-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.event-tile {
  position: absolute;
  pointer-events: auto;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: filter 0.15s ease, box-shadow 0.15s ease;
  z-index: 5;
}

.event-tile:hover {
  filter: brightness(1.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  z-index: 6;
}
```

### 6.5 Sticky left per colonna Ore

```css
.time-column,
.time-header-cell {
  position: sticky;
  left: 0;
  z-index: 10;
  background: white;
}

/* La riga delle categorie ha z-index più alto */
.category-header-cell {
  z-index: 20;
}
```

---

## 7. File Modificati

| File | Tipo | Dettagli |
|---|---|---|
| `components/CalendarTable.vue` | **Riscrittura completa** | Rimuovere `<table>`, `<thead>`, `<tbody>`, tutte le funzioni rowspan. Sostituire con flex layout + absolute positioning |
| `components/EventChip.vue` | Invariato (opzionale) | Il chip non viene più usato direttamente nel template; i tile evento hanno markup interno. EventChip può essere rimosso o mantenuto per riuso futuro |
| `components/CalendarCell.vue` | Già eliminato | Nessuna azione |
| `types/calendar.ts` | **Modificata (vedi §13)** | Aggiunti `creator` e `organizer` opzionali a `GoogleCalendarEvent` |

### Funzioni da rimuovere da CalendarTable.vue

| Funzione | Motivo |
|---|---|
| `computeHourSpans()` | Non serve più — non c'è rowspan |
| `renderableHours` (computed) | Non serve più — tutte le 13 righe sono sempre renderizzate |
| `getSpanStartingAtHour()` | Non serve più |
| `isEventActiveAtHour()` | Sostituita da `areOverlapping()` e `positionFor()` |
| `findLastEndHour()` | Non serve più |
| `computeDuration()` | Sostituita da `getDuration()` (stessa logica, nome diverso) |

### Funzioni da mantenere/aggiungere

| Funzione | Stato |
|---|---|
| `groupedCalendars` (computed) | Mantenuta — serve per header categorie |
| `flatCalendars` (computed) | Nuova — lista piatta dei calendari |
| `hours` (computed) | Mantenuta — lista ore 8-20 |
| `parseEventDate()` | Mantenuta — parsing data |
| `toMinutesFromMidnight()` | Mantenuta |
| `positionFor()` | Nuova — calcola top/height % per ogni evento |
| `getEventsForCalendar()` | Nuova — eventi con posizione + overlap resolution |
| `areOverlapping()` | Nuova — verifica overlap tra due eventi |
| `getEventColor()` / `getTextColor()` / `hashCode()` | Mantenute |
| `formatTimeRange()` | Nuova — range `[start]–[end]`, usato in tooltip e tile |
| `getDuration()` / `formatDuration()` | ~~Mantenute~~ **Rimosse (vedi §13)** — la tile mostra creatore + range orario |
| `creatorName()` | Nuova (vedi §13) — nome creatore evento con fallback su organizer |

---

## 8. Edge Cases

### Evento che inizia prima delle 08:00

```typescript
// positionFor() gestisce il clamp:
const clampedStartMin = Math.max(DAY_START_MINUTES, startMin)
// Se startMin < 480 → clampedStartMin = 480 → top = 0%
```

### Evento che finisce dopo le 20:00 (fino a 21:00)

```typescript
const clampedEndMin = Math.min(endMin, DAY_END_MINUTES)
// Se endMin > 1260 → clampedEndMin = 1260 → height si ferma a fine griglia
```

### All-day event

```typescript
if (isAllDayEvent(event)) {
  return { top: '0%', height: '100%', colIndex: 0, colSpan: 1 }
}
```

### Evento < 1 ora (es. 15 min)

`heightPercent` ≈ 2%. Il tile sarà corto ma visibile grazie al `min-height: 2%` nel `positionFor()`.

### Due eventi sovrapposti sullo stesso calendario

```typescript
// areOverlapping() rileva la sovrapposizione
// getEventsForCalendar() assegna colIndex/colSpan tramite bin packing
// Il tile avrà left/width proporzionali:
// left: `calc(${colIndex} * (100% / ${colSpan}) + 2px)`
// width: `calc(100% / ${colSpan} - 4px)`
```

### Nessun evento in un calendario

`getEventsForCalendar()` restituisce array vuoto → nessun tile renderizzato, solo slot vuoti.

---

## 9. Testing Manuale Checklist

- [ ] Evento singola ora (09:00–10:00) → tile alto ~7.7% della griglia
- [ ] Evento multi-ora (08:00–13:00) → tile alto ~38.5%, nome + "5h" centrato
- [ ] Evento multi-ora (10:00–14:00) su colonna diversa → affiancato, nessuna interferenza
- [ ] Due eventi consecutivi (09:00–10:30, 10:30–12:00) → due tile separati, allineati
- [ ] Due eventi sovrapposti (09:00–10:30, 09:30–11:00) → affiancati (colIndex 0 e 1)
- [ ] Evento che passa le 20:00 → tile si ferma a fine griglia, nessun overflow
- [ ] All-day event → barra completa dall'alto al basso
- [ ] Evento < 1 ora → tile corto ma leggibile
- [ ] Calendario senza eventi → tutti slot vuoti, nessun glitch
- [ ] Colonna "Ora" mostra SEMPRE tutte le 13 fasce orarie
- [ ] Nessun evento influenza le altre colonne
- [ ] Scroll orizzontale funziona su tablet/mobile
- [ ] Eventi pomeridiani visibili anche con eventi mattutini lunghi
- [ ] Hover su tile → brighten + shadow più pronunciato
- [ ] Tooltip al hover → nome + orario completo
- [ ] Header categorie allineato con colonne sottostanti
- [ ] Errori calendario (⚠) visibili nel nome colonna

---

## 10. Ordine di Implementazione

1. **Rimuovere** tutte le funzioni rowspan da `CalendarTable.vue` (`computeHourSpans`, `renderableHours`, `getSpanStartingAtHour`, `isEventActiveAtHour`, `findLastEndHour`)
2. **Rimuovere** il template `<table>`/`<thead>`/`<tbody>` e il vecchio `<CalendarCell>` reference
3. **Aggiungere** costanti temporali (`DAY_START_MINUTES`, `TOTAL_DAY_MINUTES`)
4. **Aggiungere** `parseEventDate()`, `toMinutesFromMidnight()`, `positionFor()`
5. **Aggiungere** `areOverlapping()`, `getEventsForCalendar()` con bin packing
6. **Aggiungere** `getEventColor()`, `getTextColor()`, `hashCode()` (da esistente)
7. **Costruire** il nuovo template con flex layout
8. **Aggiungere** gli stili CSS
9. **Testare** con la checklist sopra
10. **Cleanup** — rimuovere codice morto, aggiornare import

---

## 11. Compatibilità con Specific Esistenti

| Specifica | Stato | Note |
|---|---|---|
| Slot orari fissi 08:00–20:00 | ✅ | 13 righe sempre presenti |
| Colonne raggruppate per categoria | ✅ | Flex header rows |
| Header a due righe | ✅ | Diventa 2 flex rows sopra griglia |
| Errori per calendario (403/404) | ✅ | Indicatori in colonna header |
| Responsive scroll orizzontale | ✅ | `overflow-x: auto` sul wrapper |
| localStorage config | ✅ | Nessuna modifica |
| All-day events | ✅ | Barra completa altezza colonna |
| Eventi multi-ora in colonne diverse | ✅ | Indipendenti, nessuna influenza |
| Eventi sovrapposti stesso calendario | ✅ | Affiancati con bin packing |

---

## 12. Criticità e Considerazioni

1. **Allineamento header-colonne**: le intestazioni categorie devono avere stessa larghezza totale delle colonne sottostanti. Usare `flex-grow` proporzionale al numero di calendari nel gruppo (`:style="{ flexGrow: group.calendars.length }"`).

2. **Altezza slot**: `time-slot-cell` deve avere altezza fissa (es. 50px) e `slot-divider` deve avere `min-height` uguale. Questo garantisce allineamento verticale tra colonna ore e colonne calendari.

3. **Overflow clipping**: aggiungere `overflow: hidden` a `.calendar-column` per evitare che tile escano dalla colonna.

4. **z-index layering**: slot grid (z-index: 1) sotto events overlay (z-index: 5). Sticky left column (z-index: 10). Header (z-index: 20).

5. **Performance**: con molti eventi, `getEventsForCalendar()` viene chiamato ad ogni render. Per ottimizzare, memorizzare in un computed:

```typescript
const eventsByCalId = computed(() => {
  const map = new Map<string, PositionedEvent[]>()
  for (const cal of flatCalendars.value) {
    map.set(cal.id, getEventsForCalendar(cal.id))
  }
  return map
})
```

Poi nel template: `v-for="pe in eventsByCalId.get(c.id) || []"`

6. **Test visivo**: il nuovo layout richiede verifica manuale su diverse risoluzioni per confermare allineamento e proporzioni.

---

## 13. Modifica: tile evento — creatore + range orario al posto della durata

**Data**: 2026-11-01

### Obiettivo

Nella tile dell'evento, invece della durata (`2h30m`), visualizzare tre righe:

```
Nome evento
Utente creatore
[start]–[end]   (es. 09:30–10:15)
```

### Modifiche ai tipi (`types/calendar.ts`)

Aggiunti i campi opzionali `creator` e `organizer` a `GoogleCalendarEvent` (la API Google restituisce già questi campi: `fetchCalendarEvents` in `useCalendarEvents.ts` propaga l'intero oggetto con spread `...event`):

```typescript
export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: { dateTime: string; date?: string }
  end: { dateTime: string; date?: string }
  creator?: { email?: string; displayName?: string; self?: boolean }
  organizer?: { email?: string; displayName?: string }
}
```

### Modifiche a `components/CalendarTable.vue`

- **Rimosse** `getDuration()` e `formatDuration()` (usate solo per la durata nella tile).
- **Aggiunta** `creatorName(event)`: usa `creator` con fallback su `organizer`; preferisce `displayName`, altrimenti mostra la local-part dell'email (es. `mario.rossi` da `mario.rossi@azienda.com`); restituisce `''` se nessun dato è disponibile.
- **Tile a 3 righe**: titolo (11px, fino a 2 righe) → creatore (9px, `truncate`) → range orario (9px, solo per eventi non all-day).
- **Tooltip aggiornato**: `Titolo — Utente (HH:MM–HH:MM)`.

### Scelte di design

| Scelta | Motivo |
|---|---|
| `creator` con fallback `organizer` | Su calendari-sala l'organizzatore è spesso più significativo del creatore tecnico |
| Local-part dell'email | Compatto per le tile piccole; email completa andrebbe in overflow |
| Range orario nascosto per all-day | Con `date` (solo `YYYY-MM-DD`) il range risulterebbe un inutile `00:00–00:00` |
| Rimozione durata | `formatTimeRange` comunica la stessa informazione in modo più esplicito |

### File toccati

| File | Modifica |
|---|---|
| `types/calendar.ts` | Aggiunti `creator?` e `organizer?` al tipo `GoogleCalendarEvent` |
| `components/CalendarTable.vue` | Rimossi `getDuration()`/`formatDuration()`; aggiunta `creatorName()`; tile a 3 righe; tooltip con creatore |
| `docs/TASK_MULTI_HOUR_ROWSPAN.md` | Questa sezione + aggiornati §4.4, §5, §7 |
