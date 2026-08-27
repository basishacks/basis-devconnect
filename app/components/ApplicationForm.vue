<script setup lang="ts">
import type {
  ApplicationClientType,
  ApplicationInput,
} from "~~/shared/types/applications";

const props = withDefaults(
  defineProps<{
    initialValue?: ApplicationInput;
    submitLabel?: string;
    loading?: boolean;
  }>(),
  {
    initialValue: () => ({
      name: "",
      clientType: "confidential",
      redirectUris: [""],
    }),
    submitLabel: "Save application",
    loading: false,
  },
);

const emit = defineEmits<{
  submit: [value: ApplicationInput];
  cancel: [];
}>();

const clientTypeItems = [
  {
    label: "Confidential web application",
    value: "confidential",
  },
  {
    label: "Public PKCE application",
    value: "public",
  },
];

const state = reactive<ApplicationInput>({
  name: props.initialValue.name,
  clientType: props.initialValue.clientType,
  redirectUris: [...props.initialValue.redirectUris],
});

watch(
  () => props.initialValue,
  (value) => {
    state.name = value.name;
    state.clientType = value.clientType;
    state.redirectUris = [...value.redirectUris];
  },
  { deep: true },
);

function addRedirectUri() {
  if (state.redirectUris.length < 10) {
    state.redirectUris.push("");
  }
}

function removeRedirectUri(index: number) {
  if (state.redirectUris.length > 1) {
    state.redirectUris.splice(index, 1);
  }
}

function submit() {
  emit("submit", {
    name: state.name,
    clientType: state.clientType as ApplicationClientType,
    redirectUris: [...state.redirectUris],
  });
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <UFormField label="Application name" name="name" required>
      <UInput
        v-model="state.name"
        class="w-full"
        maxlength="100"
        autocomplete="off"
        placeholder="My application"
        required
      />
    </UFormField>

    <UFormField
      label="Client type"
      name="clientType"
      help="Confidential clients receive a secret. Public clients must use PKCE."
      required
    >
      <USelect
        v-model="state.clientType"
        class="w-full"
        :items="clientTypeItems"
        value-key="value"
      />
    </UFormField>

    <UFormField
      label="Redirect URIs"
      name="redirectUris"
      help="Use HTTPS. HTTP is accepted only for localhost and loopback development URLs."
      required
    >
      <div class="space-y-3">
        <div
          v-for="(_, index) in state.redirectUris"
          :key="index"
          class="flex items-center gap-2"
        >
          <UInput
            v-model="state.redirectUris[index]"
            class="flex-1"
            type="url"
            inputmode="url"
            placeholder="https://example.com/auth/callback"
            required
          />
          <UButton
            v-if="state.redirectUris.length > 1"
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            aria-label="Remove redirect URI"
            @click="removeRedirectUri(index)"
          />
        </div>

        <UButton
          v-if="state.redirectUris.length < 10"
          type="button"
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          label="Add redirect URI"
          @click="addRedirectUri"
        />
      </div>
    </UFormField>

    <div class="flex flex-wrap justify-end gap-3">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        label="Cancel"
        :disabled="loading"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        icon="i-lucide-save"
        :label="submitLabel"
        :loading="loading"
      />
    </div>
  </form>
</template>
