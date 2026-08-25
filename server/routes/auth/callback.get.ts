import { createError, getRequestURL, sendRedirect } from 'h3'
import * as oidc from 'openid-client'

const LOGIN_FLOW_MAX_AGE_MS = 10 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const flow = session.secure?.basisAuthFlow

  if (!flow || Date.now() - flow.createdAt > LOGIN_FLOW_MAX_AGE_MS) {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Login session is missing or expired'
    })
  }

  try {
    const { client, settings } = await getBasisAuthClient(event)
    const callbackUrl = new URL(settings.redirectUri)
    callbackUrl.search = getRequestURL(event).search

    const tokens = await oidc.authorizationCodeGrant(client, callbackUrl, {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true
    })
    const claims = tokens.claims()

    if (!claims?.sub) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Basis Auth returned an invalid identity'
      })
    }

    const email = typeof claims.email === 'string' ? claims.email : undefined
    const name = typeof claims.name === 'string' ? claims.name : email || claims.sub

    await replaceUserSession(event, {
      user: {
        id: claims.sub,
        name,
        email,
        emailVerified: typeof claims.email_verified === 'boolean'
          ? claims.email_verified
          : undefined
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/')
  } catch {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Basis Auth login failed'
    })
  }
})
