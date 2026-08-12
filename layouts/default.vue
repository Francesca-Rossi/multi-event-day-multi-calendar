<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-xl font-semibold text-gray-900">Multi-Event Calendar</h1>
          <nav class="flex space-x-4">
            <NuxtLink
              to="/dashboard"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
              :class="route.path === '/dashboard' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/settings"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
              :class="route.path === '/settings' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'"
            >
              Settings
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
const route = useRoute()
</script>
