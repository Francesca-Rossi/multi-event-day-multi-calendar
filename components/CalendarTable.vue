<script setup lang="ts">
import type { CalendarEntry, Category } from '~/types/calendar'
import type { GoogleCalendarEvent } from '~/types/calendar'
import CalendarCell from './CalendarCell.vue'

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

/**
 * Orario di inizio della tabella (08:00 secondo SPEC.md)
 */
const START_HOUR = 8

/**
 * Orario di fine della tabella (20:00 secondo SPEC.md)
 */
const END_HOUR = 20

/**
 * Genera array di ore dalle 08:00 alle 20:00 (13 righe totali)
 * 
 * Questo computed property crea una lista fissa di ore per le righe della tabella
 * Secondo SPEC.md: Righe fisse dalle 08:00 alle 20:00, slot da 60 minuti (13 righe totali)
 */
const hours = computed(() => {
  const result: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    result.push(h)
  }
  return result
})

/**
 * Interfaccia interna per un gruppo di calendari nella testata
 */
interface CategoryGroup {
  category: Category | null
  calendars: CalendarEntry[]
}

/**
 * Raggruppa i calendari per categoria nell'ordine delle categorie definite.
 * I calendari senza categoria formano un gruppo "Senza categoria" in fondo.
 * Utilizzato sia per la riga superiore (span della categoria) sia per la
 * riga dei nomi dei calendari.
 */
const groupedCalendars = computed<CategoryGroup[]>(() => {
  const groups: CategoryGroup[] = []

  // Gruppi per le categorie definite (in ordine di inserimento)
  for (const category of props.categories) {
    const calList = props.calendars.filter((cal) => cal.category === category.id)
    if (calList.length > 0) {
      groups.push({ category, calendars: calList })
    }
  }

  // Gruppo "Senza categoria" (in fondo)
  const unassigned = props.calendars.filter((cal) => !cal.category)
  if (unassigned.length > 0) {
    groups.push({ category: null, calendars: unassigned })
  }

  // Fallback: se non ci sono raggruppamenti ma ci sono calendari
  // (es. categorie non più esistenti), mettili in "Senza categoria"
  if (groups.length === 0 && props.calendars.length > 0) {
    groups.push({ category: null, calendars: [...props.calendars] })
  }

  return groups
})
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
    
    <!-- Tabella Oraria -->
    <table v-else class="min-w-full bg-white border-collapse shadow-sm">
      <!-- Header: due righe - categorie (riga superiore) e nomi calendari (riga inferiore) -->
      <thead>
        <!-- Riga superiore: nome delle categorie (colspan sui calendari del gruppo) -->
        <tr class="bg-gray-200 sticky top-0 z-10">
          <th
            :rowspan="2"
            class="sticky left-0 z-20 bg-gray-200 px-4 py-3 text-left font-semibold border-r border-gray-300"
          >
            Ora
          </th>
          <th
            v-for="group in groupedCalendars"
            :key="group.category ? group.category.id : `uncategorized-${group.calendars[0]?.id ?? 'none'}`"
            :colspan="group.calendars.length"
            class="px-4 py-2 text-center font-semibold border-r border-gray-300 last:border-r-0"
          >
            <span class="text-xs uppercase tracking-wide">
              {{ group.category ? group.category.name : 'Senza categoria' }}
            </span>
          </th>
        </tr>

        <!-- Riga inferiore: nomi dei calendari -->
        <tr class="bg-gray-100 sticky top-0 z-10">
          <th
            v-for="c in groupedCalendars.flatMap((g) => g.calendars)"
            :key="c.id"
            class="px-4 py-3 text-left font-semibold min-w-[200px] border-r border-gray-300 last:border-r-0"
          >
            <div class="flex flex-col gap-1">
              <span>{{ c.displayName || c.id }}</span>
              <span
                v-if="errors.get(c.id)"
                class="inline-flex items-center gap-1 text-xs font-medium text-red-700"
                :title="errors.get(c.id)"
              >
                ⚠ Errore accesso
              </span>
            </div>
          </th>
        </tr>
      </thead>
      
      <!-- Corpo della tabella con righe orarie -->
      <tbody>
        <tr
          v-for="h in hours"
          :key="h"
          class="hover:bg-gray-50 transition-colors"
        >
          <!-- Colonna Ora (sticky per rimanere visibile durante scroll orizzontale) -->
          <td class="sticky left-0 z-10 bg-white px-4 py-3 font-medium border-r border-gray-200 whitespace-nowrap">
            {{ String(h).padStart(2, '0') }}:00
          </td>
          
          <!-- Celle evento per ogni calendario (stesso ordine della testata) -->
          <CalendarCell
            v-for="c in groupedCalendars.flatMap((g) => g.calendars)"
            :key="`${c.id}-${h}`"
            :hour="h"
            :events="eventsByCalendar.get(c.id) || []"
            :calendar-id="c.id"
          />
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Stili aggiuntivi per migliorare la leggibilità */
table {
  border: 1px solid #e5e7eb;
}

th {
  border-bottom: 2px solid #d1d5db;
}

td {
  border-right: 1px solid #e5e7eb;
}
</style>
