<template>
  <!-- Layout principale dell'applicazione -->
  <!-- NuxtPage caricherà le pagine definite in pages/ -->
  <div class="min-h-screen bg-gray-50">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
// Inietta lo script Google Identity Services (GSI)
// Necessario per l'autenticazione OAuth2 con Google
useHead({
  script: [
    {
      src: 'https://accounts.google.com/gsi/client',
      async: true,
      defer: true
    }
  ]
})
</script>
