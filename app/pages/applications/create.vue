<script setup lang="ts">
import type {
  ApplicationInput,
  ApplicationMutationResponse,
} from "~~/shared/types/applications";

definePageMeta({ middleware: "auth" });

useSeoMeta({
  title: "Register Application",
  description: "Register a new OpenID Connect application.",
});

const toast = useToast();
const saving = ref(false);
const created = ref<ApplicationMutationResponse>();

function errorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "Please try again.";
  const value = error as {
    data?: { statusMessage?: string; message?: string };
    message?: string;
  };
  return (
    value.data?.statusMessage ||
    value.data?.message ||
    value.message ||
    "Please try again."
  );
}

async function register(input: ApplicationInput) {
  saving.value = true;
  try {
    created.value = await $fetch<ApplicationMutationResponse>(
      "/api/applications",
      {
        method: "POST",
        body: input,
      },
    );
    toast.add({ title: "Application registered", color: "success" });
  } catch (error) {
    toast.add({
      title: "Could not register application",
      description: errorMessage(error),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function copySecret() {
  if (!created.value?.clientSecret) return;
  await navigator.clipboard.writeText(created.value.clientSecret);
  toast.add({ title: "Client secret copied", color: "success" });
}
</script>

<template>
  <UDashboardPanel id="application-create">
    <template #header>
      <UDashboardNavbar title="Register Application">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-2xl p-6 sm:p-8">
        <template v-if="created">
          <div class="text-center">
            <UIcon name="i-lucide-circle-check" class="size-12 text-success" />
            <h1 class="mt-4 text-3xl font-semibold text-highlighted">
              Application registered
            </h1>
            <p class="mt-2 text-muted">
              {{ created.application.name }} is ready to configure.
            </p>
          </div>

          <UCard class="mt-8">
            <dl class="space-y-5">
              <div>
                <dt class="text-sm font-medium text-muted">Client ID</dt>
                <dd class="mt-1 break-all font-mono text-sm text-highlighted">
                  {{ created.application.clientId }}
                </dd>
              </div>

              <div v-if="created.clientSecret">
                <dt class="text-sm font-medium text-warning">Client secret</dt>
                <dd class="mt-2 flex items-start gap-2">
                  <code
                    class="min-w-0 flex-1 break-all rounded-md bg-elevated p-3 text-sm"
                  >
                    {{ created.clientSecret }}
                  </code>
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-copy"
                    aria-label="Copy client secret"
                    @click="copySecret"
                  />
                </dd>
                <p class="mt-2 text-sm text-warning">
                  Copy this secret now. It cannot be retrieved again.
                </p>
              </div>
            </dl>
          </UCard>

          <div class="mt-6 flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              label="Back to applications"
              to="/applications"
            />
            <UButton
              label="Open application"
              trailing-icon="i-lucide-arrow-right"
              :to="`/applications/${encodeURIComponent(created.application.clientId)}`"
            />
          </div>
        </template>

        <template v-else>
          <h1 class="text-3xl font-semibold text-highlighted">
            Register Application
          </h1>
          <p class="mt-3 text-muted">
            Create an OpenID Connect client. You will become its first
            administrator.
          </p>

          <UCard class="mt-8">
            <ApplicationForm
              submit-label="Register application"
              :loading="saving"
              @submit="register"
              @cancel="navigateTo('/applications')"
            />
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
