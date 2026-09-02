<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => t('nav.pageTitle'),
  description: () => t('nav.pageDescription')
})
</script>

<template>
  <NavHome />
</template>
