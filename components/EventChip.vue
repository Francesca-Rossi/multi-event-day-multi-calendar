<script setup lang="ts">
import type { GoogleCalendarEvent } from '~/types/calendar'

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
    @click="$emit('click', $event)"
    :title="eventName"
  >
    {{ eventName }}
  </div>
</template>
