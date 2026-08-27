<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

interface Application {
  name: string;
  clientId: string;
  updatedAt: string;
}

interface ApplicationsResponse {
  items: Application[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const description =
  "Use DevConnect Applications to connect BASIS OpenID to your applications.";

definePageMeta({
  middleware: "auth",
});

useSeoMeta({
  title: "Applications",
  description,
});

const columns: TableColumn<Application>[] = [
  {
    accessorKey: "name",
    header: "Application Name",
  },
  {
    accessorKey: "clientId",
    header: "Client ID",
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
  },
];

const page = ref(1);
const searchInput = ref("");
const search = ref("");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

watch(searchInput, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    search.value = value.trim();
  }, 300);
});

onBeforeUnmount(() => clearTimeout(searchTimer));

const {
  data: result,
  error,
  status,
} = await useFetch<ApplicationsResponse>("/api/applications", {
  query: {
    page,
    search,
  },
  default: () => ({
    items: [],
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  }),
});
</script>

<template>
  <UDashboardPanel id="applications">
    <template #header>
      <UDashboardNavbar title="Applications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 sm:p-8">
        <h1 class="text-3xl font-semibold text-highlighted">Applications</h1>
        <p class="mt-3 text-muted">{{ description }}</p>

        <div
          class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <UInput
            v-model="searchInput"
            class="w-full sm:max-w-sm"
            type="search"
            icon="i-lucide-search"
            placeholder="Search applications by name"
            aria-label="Search applications by name"
          />

          <p class="text-sm text-muted">
            {{ result.total }}
            {{ result.total === 1 ? "application" : "applications" }}
          </p>
        </div>

        <UAlert
          v-if="error"
          class="mt-4"
          color="error"
          title="Could not load applications"
          description="Please try again later."
        />

        <UTable
          v-else
          class="mt-4"
          :columns="columns"
          :data="result.items"
          :loading="status === 'pending'"
          empty="No applications found."
        >
          <template #clientId-cell="{ row }">
            <code class="text-sm text-muted">{{ row.original.clientId }}</code>
          </template>

          <template #updatedAt-cell="{ row }">
            <NuxtTime
              :datetime="row.original.updatedAt"
              relative
              numeric="auto"
              :title="true"
            />
          </template>
        </UTable>

        <div
          v-if="!error && result.totalPages > 1"
          class="mt-6 flex justify-center"
        >
          <UPagination
            v-model:page="page"
            :total="result.total"
            :items-per-page="result.pageSize"
            show-edges
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
