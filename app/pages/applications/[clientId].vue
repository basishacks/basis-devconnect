<script setup lang="ts">
import type {
  ApplicationDetail,
  ApplicationInput,
  ApplicationMutationResponse,
} from "~~/shared/types/applications";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const toast = useToast();
const clientId = computed(() => String(route.params.clientId));
const endpoint = computed(
  () => `/api/applications/${encodeURIComponent(clientId.value)}`,
);
const editing = ref(false);
const saving = ref(false);
const deleting = ref(false);
const deleteModalOpen = ref(false);
const oneTimeSecret = ref<string>();

const {
  data: application,
  error,
  status,
} = await useFetch<ApplicationDetail>(endpoint);

const formValue = computed<ApplicationInput>(() => ({
  name: application.value?.name ?? "",
  clientType: application.value?.clientType ?? "confidential",
  redirectUris: application.value?.redirectUris.length
    ? [...application.value.redirectUris]
    : [""],
}));

useSeoMeta({
  title: computed(() => application.value?.name ?? "Application"),
  description: "View and manage an OpenID Connect application.",
});

function errorMessage(value: unknown): string {
  if (typeof value !== "object" || value === null) return "Please try again.";
  const requestError = value as {
    data?: { statusMessage?: string; message?: string };
    message?: string;
  };
  return (
    requestError.data?.statusMessage ||
    requestError.data?.message ||
    requestError.message ||
    "Please try again."
  );
}

async function update(input: ApplicationInput) {
  saving.value = true;
  try {
    const response = await $fetch<ApplicationMutationResponse>(endpoint.value, {
      method: "PATCH",
      body: input,
    });
    application.value = response.application;
    oneTimeSecret.value = response.clientSecret;
    editing.value = false;
    toast.add({ title: "Application updated", color: "success" });
  } catch (requestError) {
    toast.add({
      title: "Could not update application",
      description: errorMessage(requestError),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function removeApplication() {
  deleting.value = true;
  try {
    await $fetch(endpoint.value, { method: "DELETE" });
    toast.add({ title: "Application deleted", color: "success" });
    await navigateTo("/applications");
  } catch (requestError) {
    toast.add({
      title: "Could not delete application",
      description: errorMessage(requestError),
      color: "error",
    });
  } finally {
    deleting.value = false;
    deleteModalOpen.value = false;
  }
}

async function copySecret() {
  if (!oneTimeSecret.value) return;
  await navigator.clipboard.writeText(oneTimeSecret.value);
  toast.add({ title: "Client secret copied", color: "success" });
}
</script>

<template>
  <UDashboardPanel id="application-detail">
    <template #header>
      <UDashboardNavbar :title="application?.name || 'Application'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-4xl p-6 sm:p-8">
        <div v-if="status === 'pending'" class="flex justify-center py-16">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-8 animate-spin text-primary"
          />
        </div>

        <UAlert
          v-else-if="error"
          color="error"
          title="Could not load application"
          :description="errorMessage(error)"
        />

        <template v-else-if="application">
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-3xl font-semibold text-highlighted">
                  {{ application.name }}
                </h1>
                <UBadge
                  v-if="application.canManage"
                  color="primary"
                  variant="subtle"
                  label="Application admin"
                />
              </div>
              <p class="mt-2 break-all font-mono text-sm text-muted">
                {{ application.clientId }}
              </p>
            </div>

            <div v-if="application.canManage && !editing" class="flex gap-2">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-pencil"
                label="Edit"
                @click="editing = true"
              />
              <UButton
                color="error"
                variant="subtle"
                icon="i-lucide-trash-2"
                label="Delete"
                @click="deleteModalOpen = true"
              />
            </div>
          </div>

          <UAlert
            v-if="oneTimeSecret"
            class="mt-6"
            color="warning"
            title="New client secret"
            description="The application is now confidential. Copy this secret now; it cannot be retrieved again."
          >
            <template #actions>
              <div class="mt-3 flex w-full items-start gap-2">
                <code
                  class="min-w-0 flex-1 break-all rounded-md bg-elevated p-3 text-sm"
                >
                  {{ oneTimeSecret }}
                </code>
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-copy"
                  aria-label="Copy client secret"
                  @click="copySecret"
                />
              </div>
            </template>
          </UAlert>

          <UCard v-if="editing" class="mt-8">
            <template #header>
              <h2 class="text-lg font-semibold text-highlighted">
                Edit application
              </h2>
            </template>
            <ApplicationForm
              :initial-value="formValue"
              submit-label="Save changes"
              :loading="saving"
              @submit="update"
              @cancel="editing = false"
            />
          </UCard>

          <div v-else class="mt-8 grid gap-6 md:grid-cols-2">
            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold text-highlighted">
                  Client configuration
                </h2>
              </template>
              <dl class="space-y-5">
                <div>
                  <dt class="text-sm font-medium text-muted">Client type</dt>
                  <dd class="mt-1 capitalize text-highlighted">
                    {{ application.clientType }}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted">
                    Consent required
                  </dt>
                  <dd class="mt-1 text-highlighted">
                    {{ application.requireConsent ? "Yes" : "No" }}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-muted">Last updated</dt>
                  <dd class="mt-1 text-highlighted">
                    <NuxtTime
                      :datetime="application.updatedAt"
                      relative
                      numeric="auto"
                      :title="true"
                      locale="en-US"
                    />
                  </dd>
                </div>
              </dl>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold text-highlighted">
                  Redirect URIs
                </h2>
              </template>
              <ul class="space-y-2">
                <li
                  v-for="uri in application.redirectUris"
                  :key="uri"
                  class="break-all rounded-md bg-elevated p-3 font-mono text-sm"
                >
                  {{ uri }}
                </li>
              </ul>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold text-highlighted">Scopes</h2>
              </template>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="scope in application.scopes"
                  :key="scope"
                  color="neutral"
                  variant="subtle"
                  :label="scope"
                />
                <span
                  v-if="!application.scopes.length"
                  class="text-sm text-muted"
                >None</span>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold text-highlighted">
                  Resources
                </h2>
              </template>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="resource in application.resources"
                  :key="resource"
                  color="neutral"
                  variant="subtle"
                  :label="resource"
                />
                <span
                  v-if="!application.resources.length"
                  class="text-sm text-muted"
                >None</span>
              </div>
            </UCard>

            <UCard class="md:col-span-2">
              <template #header>
                <h2 class="text-lg font-semibold text-highlighted">
                  Identity filter
                </h2>
              </template>
              <p class="text-sm text-muted">
                Mode:
                <span class="font-medium text-highlighted">
                  {{ application.filterMode || "Not configured" }}
                </span>
              </p>
              <div
                v-if="application.filterContent.length"
                class="mt-3 flex flex-wrap gap-2"
              >
                <UBadge
                  v-for="entry in application.filterContent"
                  :key="entry"
                  color="neutral"
                  variant="subtle"
                  :label="entry"
                />
              </div>
            </UCard>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="deleteModalOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-triangle-alert" class="text-error" />
            <h2 class="font-semibold text-highlighted">Delete application</h2>
          </div>
        </template>

        <p class="text-muted">
          Delete
          <strong class="text-highlighted">{{ application?.name }}</strong>? Existing grants, authorization requests, and tokens for this client
          will be removed. This cannot be undone.
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              :disabled="deleting"
              @click="deleteModalOpen = false"
            />
            <UButton
              color="error"
              label="Delete application"
              :loading="deleting"
              @click="removeApplication"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
