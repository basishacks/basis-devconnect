<script setup lang="ts">

</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 sm:p-8">
        <h1 class="text-2xl font-semibold text-highlighted">
          Welcome back!
        </h1>
        <p class="mt-3 text-muted">
          This is the DevConnect portal.
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
