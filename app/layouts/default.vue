<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const { user } = useUserSession()

const links = [[{
  label: 'Documentation', 
  icon: 'i-lucide-file',
  to: 'https://docs.biszweb.club/',
  target: '_blank'
}], [{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/'
}, 
{
  label: "Applications",
  icon: "i-lucide-app-window",
  to: "/applications"
}
]] satisfies NavigationMenuItem[]
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <ULink
          to="/"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-highlighted"
        >
          <UIcon name="i-lucide-code" class="size-5 shrink-0 text-primary" />
          <span v-if="!collapsed">DevConnect</span>
        </ULink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex items-center gap-2 px-2 py-1.5" aria-label="User">
          <UAvatar :alt="user?.name" icon="i-lucide-user" size="sm" />
          <span v-if="!collapsed" class="truncate text-sm font-medium text-highlighted">
            {{ user?.name || user?.email }}
          </span>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
