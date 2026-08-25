// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    basisAuth: {
      issuer: 'http://localhost:3000',
      clientId: 'b14c99b1-db96-4d76-b82b-9003f207c4f2',
      clientSecret: '',
      redirectUri: 'https://portal.bisz.dev/auth/callback',
      resource: 'urn:basis:api'
    },
    session: {
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    provider: 'none',
    clientBundle: {
      icons: [
        'lucide:code',
        'lucide:house',
        'lucide:user'
      ]
    }
  }
})
