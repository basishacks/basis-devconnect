<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type {
  ApplicationsResponse,
  ApplicationSummary,
} from "~~/shared/types/applications";

const description =
  "Use DevConnect Applications to connect BASIS OpenID to your applications.";

definePageMeta({
  middleware: "auth",
});

useSeoMeta({
  title: "Applications",
  description,
});

const columns: TableColumn<ApplicationSummary>[] = [
  {
    accessorKey: "name",
    header: "Application Name",
  },
  {
    accessorKey: "clientId",
    header: "Client ID",
  },
  {
    accessorKey: "clientType",
    header: "Type",
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
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 class="text-3xl font-semibold text-highlighted">
              Applications
            </h1>
            <p class="mt-3 text-muted">{{ description }}</p>
          </div>
          <UButton
            to="/applications/create"
            icon="i-lucide-plus"
            label="Register App"
          />
        </div>

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
          <template #name-cell="{ row }">
            <ULink
              :to="`/applications/${encodeURIComponent(row.original.clientId)}`"
              class="font-medium text-primary hover:underline"
            >
              {{ row.original.name }}
            </ULink>
            <UBadge
              v-if="row.original.canManage"
              class="ml-2"
              color="primary"
              variant="subtle"
              label="Admin"
            />
          </template>

          <template #clientId-cell="{ row }">
            <code class="text-sm text-muted">{{ row.original.clientId }}</code>
          </template>

          <template #clientType-cell="{ row }">
            <UBadge
              color="neutral"
              variant="subtle"
              class="capitalize"
              :label="row.original.clientType"
            />
          </template>

          <template #updatedAt-cell="{ row }">
            <NuxtTime
              :datetime="row.original.updatedAt"
              relative
              numeric="auto"
              :title="true"
              locale="en-US"
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
