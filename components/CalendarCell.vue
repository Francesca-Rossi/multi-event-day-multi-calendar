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
 * Verifica se un evento è all-day (senza orario)
 * 
 * Un evento all-day ha il campo `start.date` ma non `start.dateTime`.
 * Occupano l'intera giornata, quindi vanno mostrati su tutte le righe orarie.
 * 
 * @param event - L'evento da verificare
 * @returns true se l'evento è all-day
 */
const isAllDayEvent = (event: GoogleCalendarEvent): boolean => {
  return !!(event.start?.date && !event.start?.dateTime)
}

/**
 * Converte un orario in minuti dalla mezzanotte
 * 
 * @param date - Data di cui estrarre l'orario
 * @returns Minuti dalla mezzanotte (es. 13:30 -> 810)
 */
const toMinutes = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Trova l'evento attivo per una specifica riga oraria
 * 
 * Un evento è attivo nello slot [hour, hour+1) se lo interseca:
 * startMin < slotEnd && endMin > slotStart
 * Il confronto usa i minuti (non solo l'ora) per far emergere anche gli
 * eventi più corti di un'ora che iniziano e finiscono nella stessa ora
 * (es. 13:00-13:30, che con il confronto sulle ore intere non compariva mai).
 * Gli eventi all-day sono considerati attivi su tutte le ore del giorno.
 * 
 * @returns L'evento attivo o null se non ci sono eventi
 */
const activeEvent = computed(() => {
  const slotStart = props.hour * 60
  const slotEnd = (props.hour + 1) * 60
  
  // Cerca un evento che interseca questo slot orario
  return props.events.find(event => {
    // Gli eventi all-day coprono l'intera giornata
    if (isAllDayEvent(event)) return true

    const startDateTime = event.start?.dateTime || event.start?.date
    const endDateTime = event.end?.dateTime || event.end?.date
    
    if (!startDateTime || !endDateTime) return false
    
    const startMin = toMinutes(new Date(startDateTime))
    const endMin = toMinutes(new Date(endDateTime))
    
    // Intervallo [start, end): evento attivo se interseca lo slot
    return startMin < slotEnd && endMin > slotStart
  }) || null
})
</script>

<template>
  <td class="border border-gray-200 p-2 align-top min-w-[150px]">
    <EventChip v-if="activeEvent" :event-name="activeEvent.summary" />
    <span v-else class="text-gray-400">—</span>
  </td>
</template>
