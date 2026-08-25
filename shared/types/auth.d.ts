declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    email?: string
    emailVerified?: boolean
  }

  interface SecureSessionData {
    basisAuthFlow?: {
      state: string
      nonce: string
      codeVerifier: string
      createdAt: number
    }
  }

  interface UserSession {
    loggedInAt?: number
  }
}

export {}
