<script setup lang="ts">
/**
 * Navigation home — intentionally renders WITHOUT the default layout
 * (layout: false), so it acts as a standalone, full-screen landing page.
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