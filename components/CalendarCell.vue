<script setup lang="ts">
import type { GoogleCalendarEvent } from '~/types/calendar'
import EventChip from './EventChip.vue'

interface Props {
  hour: number
  events: GoogleCalendarEvent[]
  calendarId: string
}

const props = defineProps<Props>()

/**
 * Trova l'evento attivo per una specifica ora
 * 
 * Un evento è attivo se: startHour <= hour < endHour
 * Questo usa l'intervallo [start, end) per evitare conflitti tra eventi consecutivi
 * 
 * @returns L'evento attivo o null se non ci sono eventi
 */
const activeEvent = computed(() => {
  const now = props.hour
  
  // Cerca un evento che include questa ora
  return props.events.find(event => {
    const startDateTime = event.start?.dateTime || event.start?.date
    const endDateTime = event.end?.dateTime || event.end?.date
    
    if (!startDateTime || !endDateTime) return false
    
    const startHour = new Date(startDateTime).getHours()
    const endHour = new Date(endDateTime).getHours()
    
    // Intervallo [start, end): evento attivo se startHour <= hour < endHour
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
