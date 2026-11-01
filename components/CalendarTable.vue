<script setup lang="ts">
import type { CalendarEntry, Category } from '~/types/calendar'
import type { GoogleCalendarEvent } from '~/types/calendar'

interface Props {
  calendars: CalendarEntry[]
  eventsByCalendar: Map<string, GoogleCalendarEvent[]>
  errors?: Map<string, string>
  isLoading: boolean
  errorMessage?: string
  categories?: Category[]
}

const props = withDefaults(defineProps<Props>(), {
  errors: () => new Map<string, string>(),
  errorMessage: undefined,
  categories: () => [],
})

const eventMap = (): Map<string, GoogleCalendarEvent[]> => props.eventsByCalendar

// ============================================================================
// Costanti temporali
// ============================================================================

const START_HOUR = 8
const END_HOUR = 20
const TOTAL_SLOTS = END_HOUR - START_HOUR + 1
const DAY_START_MINUTES = START_HOUR * 60
const DAY_END_MINUTES = (END_HOUR + 1) * 60
const TOTAL_DAY_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES

/**
 * Genera array di ore dalle 08:00 alle 20:00 (13 righe totali)
 */
const hours = computed(() => {
  const result: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    result.push(h)
  }
  return result
})

// ============================================================================
// Raggruppamento calendari per categoria
// ============================================================================

interface CategoryGroup {
  category: Category | null
  calendars: CalendarEntry[]
}

const groupedCalendars = computed<CategoryGroup[]>(() => {
  const groups: CategoryGroup[] = []

  for (const category of props.categories) {
    const calList = props.calendars.filter((cal) => cal.category === category.id)
    if (calList.length > 0) {
      groups.push({ category, calendars: calList })
    }
  }

  const unassigned = props.calendars.filter((cal) => !cal.category)
  if (unassigned.length > 0) {
    groups.push({ category: null, calendars: unassigned })
  }

  if (groups.length === 0 && props.calendars.length > 0) {
    groups.push({ category: null, calendars: [...props.calendars] })
  }

  return groups
})

const flatCalendars = computed(() => {
  return groupedCalendars.value.flatMap(g => g.calendars)
})

// ============================================================================
// Helper: parsing date
// ============================================================================

/**
 * Parsing di una data/ora. Gestisce formato all-day (YYYY-MM-DD)
 * e formato con orario (YYYY-MM-DDTHH:mm:ss+ZZ:ZZ).
 */
function parseEventDate(value: string | undefined): Date | null {
  if (!value) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

function toMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function isAllDayEvent(event: GoogleCalendarEvent): boolean {
  return !!(event.start?.date && !event.start?.dateTime)
}

// ============================================================================
// Helper: utente creatore e formattazione
// ============================================================================

function creatorName(event: GoogleCalendarEvent): string {
  const person = event.creator ?? event.organizer
  if (person?.displayName) return person.displayName
  if (person?.email) return person.email.split('@')[0] ?? ''
  return ''
}

function formatTimeRange(event: GoogleCalendarEvent): string {
  const startStr = event.start?.dateTime ?? event.start?.date
  const endStr = event.end?.dateTime ?? event.end?.date
  if (!startStr || !endStr) return ''
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${fmt(new Date(startStr))}–${fmt(new Date(endStr))}`
}

// ============================================================================
// Helper: colori eventi
// ============================================================================

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

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return hash
}

function colorIndex(event: GoogleCalendarEvent): number {
  const hash = hashCode(event.id ?? event.summary ?? 'unknown')
  return Math.abs(hash) % eventColors.length
}

function getEventColor(event: GoogleCalendarEvent): string {
  return eventColors[colorIndex(event)]?.bg ?? 'bg-blue-500'
}

function getTextColor(event: GoogleCalendarEvent): string {
  return eventColors[colorIndex(event)]?.text ?? 'text-white'
}

// ============================================================================
// Logica posizionamento eventi (absolute positioning)
// ============================================================================

interface EventPosition {
  top: string
  height: string
  colIndex: number
  colSpan: number
}

interface PositionedEvent {
  event: GoogleCalendarEvent
  position: EventPosition
}

function positionFor(event: GoogleCalendarEvent): { top: number; height: number } {
  if (isAllDayEvent(event)) {
    return { top: 0, height: 100 }
  }

  const startStr = event.start?.dateTime ?? event.start?.date
  const endStr = event.end?.dateTime ?? event.end?.date
  if (!startStr || !endStr) return { top: 0, height: 100 }

  const startMin = toMinutesFromMidnight(new Date(startStr))
  const endMin = toMinutesFromMidnight(new Date(endStr))

  const clampedStart = Math.max(DAY_START_MINUTES, Math.min(startMin, DAY_END_MINUTES))
  const clampedEnd = Math.max(clampedStart + 15, Math.min(endMin, DAY_END_MINUTES))

  const topPct = ((clampedStart - DAY_START_MINUTES) / TOTAL_DAY_MINUTES) * 100
  const heightPct = ((clampedEnd - clampedStart) / TOTAL_DAY_MINUTES) * 100

  return {
    top: Math.max(0, topPct),
    height: Math.max(2, heightPct),
  }
}

function areOverlapping(a: GoogleCalendarEvent, b: GoogleCalendarEvent): boolean {
  const aStart = parseEventDate(a.start?.dateTime ?? a.start?.date)
  const aEnd = parseEventDate(a.end?.dateTime ?? a.end?.date)
  const bStart = parseEventDate(b.start?.dateTime ?? b.start?.date)
  const bEnd = parseEventDate(b.end?.dateTime ?? b.end?.date)
  if (!aStart || !aEnd || !bStart || !bEnd) return false
  return aStart < bEnd && bStart < aEnd
}

function getEventsForCalendar(calId: string): PositionedEvent[] {
  const events = eventMap().get(calId) || []
  if (events.length === 0) return []

  const positioned: Array<GoogleCalendarEvent & { pos: { top: number; height: number } }> =
    events.map(ev => ({ ...ev, pos: positionFor(ev) }))

  positioned.sort((a, b) => {
    const aStart = parseEventDate(a.start?.dateTime ?? a.start?.date)?.getTime() ?? 0
    const bStart = parseEventDate(b.start?.dateTime ?? b.start?.date)?.getTime() ?? 0
    return aStart - bStart
  })

  // Raggruppa eventi che si sovrappongono
  const groups: Array<Array<GoogleCalendarEvent & { pos: { top: number; height: number } }>> = []
  let i = 0
  while (i < positioned.length) {
    const first = positioned[i]
    if (!first) { i++; continue }
    const group = [first]
    let j = i + 1
    while (j < positioned.length) {
      const candidate = positioned[j]
      if (!candidate) { j++; continue }
      if (!areOverlapping(first, candidate)) break
      group.push(candidate)
      j++
    }
    groups.push(group)
    i = j
  }

  // Bin packing: assegna ogni evento del gruppo a una colonna
  const result: PositionedEvent[] = []
  for (const group of groups) {
    const columns: Array<Array<GoogleCalendarEvent & { pos: { top: number; height: number } }>> = []
    for (const ev of group) {
      let placed = false
      for (const col of columns) {
        const colFirst = col[0]
        if (colFirst && !areOverlapping(colFirst, ev)) {
          col.push(ev)
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([ev])
      }
    }

    // Assegna colIndex/colSpan per ogni evento
    for (const ev of group) {
      let colIndex = 0
      for (let c = 0; c < columns.length; c++) {
        const col = columns[c]
        if (col?.includes(ev)) {
          colIndex = c
          break
        }
      }
      result.push({
        event: ev,
        position: {
          top: `${ev.pos.top.toFixed(2)}%`,
          height: `${ev.pos.height.toFixed(2)}%`,
          colIndex,
          colSpan: columns.length,
        },
      })
    }
  }

  return result
}

/**
 * Memoizzazione: cache degli eventi posizionati per calendario.
 * Ricalcolata solo quando cambia eventsByCalendar.
 */
const positionedEventsByCal = computed(() => {
  const map = new Map<string, PositionedEvent[]>()
  for (const cal of flatCalendars.value) {
    map.set(cal.id, getEventsForCalendar(cal.id))
  }
  return map
})

// ============================================================================
// Stile: dimensioni colonna per calcolo left/width degli eventi sovrapposti
// ============================================================================

function tileStyle(pe: PositionedEvent): Record<string, string> {
  const { colIndex, colSpan } = pe.position
  const colWidth = 100 / colSpan
  const leftPct = colIndex * colWidth
  const widthPct = colWidth

  return {
    top: pe.position.top,
    height: pe.position.height,
    left: `calc(${leftPct.toFixed(2)}% + 2px)`,
    width: `calc(${widthPct.toFixed(2)}% - 4px)`,
  }
}
</script>

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

    <!-- Empty State - Nessun calendario configurato -->
    <div v-else-if="calendars.length === 0" class="text-center py-12">
      <p class="text-gray-600 mb-2">Nessun calendario configurato</p>
      <p class="text-sm text-gray-500">Vai alle impostazioni per aggiungere calendari</p>
    </div>

    <!-- Griglia calendario -->
    <div v-else class="calendar-wrapper">
      <!-- RIGA 1: Categorie -->
      <div class="calendar-header-row flex">
        <div class="time-header-cell bg-gray-200 border-b-2 border-r border-gray-300"></div>
        <div
          v-for="group in groupedCalendars"
          :key="group.category?.id || `uncat-${group.calendars[0]?.id}`"
          class="category-header-cell bg-gray-200 px-2 py-2 text-center font-semibold border-r border-gray-300 last:border-r-0"
          :style="{ flexGrow: group.calendars.length, flexBasis: 0 }"
        >
          <span class="text-xs uppercase tracking-wide">
            {{ group.category?.name || 'Senza categoria' }}
          </span>
        </div>
      </div>

      <!-- RIGA 2: Nomi calendari -->
      <div class="calendar-header-row flex">
        <div class="time-header-cell bg-gray-100 border-r border-gray-300">
          <span class="font-semibold text-sm text-gray-600">Ora</span>
        </div>
        <div
          v-for="c in flatCalendars"
          :key="c.id"
          class="cal-name-cell bg-gray-100 px-2 py-2 font-medium border-r border-gray-300 last:border-r-0"
        >
          <div class="flex flex-col gap-0.5">
            <span class="truncate block text-sm">{{ c.displayName || c.id }}</span>
            <span
              v-if="errors.get(c.id)"
              class="inline-flex items-center gap-1 text-xs font-medium text-red-700"
              :title="errors.get(c.id)"
            >
              ⚠ Errore accesso
            </span>
          </div>
        </div>
      </div>

      <!-- CORPO: Colonna Ore + Colonne Calendari -->
      <div class="calendar-body flex">
        <!-- Colonna Ore (sticky left) -->
        <div class="time-column border-r border-gray-300">
          <div
            v-for="h in hours"
            :key="h"
            class="time-slot-cell border-b border-gray-100"
          >
            {{ String(h).padStart(2, '0') }}:00
          </div>
        </div>

        <!-- Una colonna per ogni calendario -->
        <div
          v-for="c in flatCalendars"
          :key="c.id"
          class="calendar-column border-r border-gray-200 last:border-r-0"
        >
          <!-- Slot grid statico (divisori visivi) -->
          <div class="slot-grid absolute inset-0 flex flex-col pointer-events-none">
            <div
              v-for="h in hours"
              :key="h"
              class="slot-divider flex-1 border-b border-gray-100 last:border-b-0"
            ></div>
          </div>

          <!-- Overlay eventi -->
          <div class="events-overlay absolute inset-0 pointer-events-none">
            <div
              v-for="pe in positionedEventsByCal.get(c.id) || []"
              :key="pe.event.id"
              class="event-tile pointer-events-auto cursor-pointer rounded shadow-sm hover:brightness-110 transition-all overflow-hidden"
              :class="[getEventColor(pe.event), getTextColor(pe.event)]"
              :style="tileStyle(pe)"
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

<style scoped>
/* Layout generale */
.calendar-wrapper {
  display: flex;
  flex-direction: column;
  min-width: fit-content;
}

.calendar-header-row {
  display: flex;
  align-items: stretch;
  min-width: fit-content;
}

/* Colonna Ore: larghezza fissa */
.time-header-cell {
  width: 70px;
  min-width: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  position: sticky;
  left: 0;
  z-index: 20;
}

/* Colonne calendario: nomi */
.cal-name-cell {
  min-width: 180px;
  flex: 1;
  overflow: hidden;
}

/* Corpo griglia */
.calendar-body {
  display: flex;
  align-items: stretch;
  min-width: fit-content;
}

/* Colonna Ore */
.time-column {
  width: 70px;
  min-width: 70px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: sticky;
  left: 0;
  z-index: 10;
  background: white;
}

.time-slot-cell {
  height: 50px;
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

/* Colonne calendari */
.calendar-column {
  position: relative;
  flex: 1;
  min-width: 180px;
  overflow: hidden;
}

/* Slot grid statico */
.slot-grid {
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.slot-divider {
  min-height: 50px;
}

/* Overlay eventi */
.events-overlay {
  z-index: 5;
}

.event-tile {
  position: absolute;
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
</style>
