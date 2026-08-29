<script setup lang="ts">
/**
 * Navigation home — this page lives at the layer's `app/pages/index.vue`, so
 * it overrides the host project's root `/` route and turns the public home
 * into the navigation site.
 */
definePageMeta({ layout: false })
useSeoMeta({
  title: 'Navigation',
  description: 'A curated start-page of developer tools and productivity links.'
})
</script>

<template>
  <NavHome />
</template>