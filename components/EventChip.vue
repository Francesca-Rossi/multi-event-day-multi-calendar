<script setup lang="ts">
interface Props {
  eventName: string
  durationMinutes?: number
  backgroundColor?: string
  textColor?: string
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  durationMinutes: undefined,
  backgroundColor: 'bg-blue-500',
  textColor: 'text-white',
  compact: false,
})

defineEmits<{ click: [event: MouseEvent] }>()

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}` : `${h}h`
  }
  return `${minutes}min`
}
</script>

<template>
  <div
    class="rounded cursor-pointer transition-colors flex flex-col items-center justify-center"
    :class="[
      backgroundColor,
      textColor,
      compact ? 'px-1 py-1 min-h-[60px]' : 'px-2 py-1',
    ]"
    @click="$emit('click', $event)"
    :title="eventName"
  >
    <span class="font-medium text-left truncate max-w-[140px]" :class="compact ? 'text-[11px]' : 'text-xs'">
      {{ eventName }}
    </span>
    <span v-if="durationMinutes !== undefined" class="text-center opacity-80 mt-0.5" :class="compact ? 'text-[9px]' : 'text-[10px]'">
      {{ formatDuration(durationMinutes) }}
    </span>
  </div>
</template>
