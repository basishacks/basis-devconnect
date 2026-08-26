<script setup lang="ts">
const colorMode = useColorMode();

const themeColor = computed(() =>
  colorMode.value === "dark" ? "#1b1718" : "white",
);
const description = "A simple portal for DevConnect.";

useHead({
  titleTemplate: (title) => (title ? `DevConnect | ${title}` : "DevConnect"),
  htmlAttrs: {
    lang: "en",
  },
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: themeColor },
  ],
});

useSeoMeta({
  description,
  ogSiteName: "DevConnect",
  ogDescription: description,
});
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
