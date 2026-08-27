<script setup lang="ts">
import type { NuxtError } from "#app";

defineProps<{
  error: NuxtError;
}>();

const loadingIndicator = useLoadingIndicator();

onMounted(() => {
  loadingIndicator.start({ force: true });
  loadingIndicator.finish({ error: true });
});
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <div class="m-8">
        <h3 class="text-primary text-3xl bold">
          {{ error.statusCode }}
        </h3>
        <p>{{ error.message }}</p>

        <UButton to="/" class="mt-4"> Get me back to home </UButton>
      </div>
    </NuxtLayout>
  </UApp>
</template>
