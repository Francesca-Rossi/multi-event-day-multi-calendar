<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <p class="text-sm text-gray-400">Reindirizzamento...</p>
  </div>
</template>

<script setup lang="ts">
const { hasCalendars } = useCalendarConfig()

onMounted(() => {
  navigateTo(hasCalendars.value ? '/dashboard' : '/settings')
})
</script>