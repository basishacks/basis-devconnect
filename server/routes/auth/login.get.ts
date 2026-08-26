import { sendRedirect } from "h3";
import * as oidc from "openid-client";

const LOGIN_FLOW_MAX_AGE = 10 * 60;

export default defineEventHandler(async (event) => {
  const { client, settings } = await getBasisAuthClient(event);
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();

  await replaceUserSession(
    event,
    {
      secure: {
        basisAuthFlow: {
          state,
          nonce,
          codeVerifier,
          createdAt: Date.now(),
        },
      },
    },
    {
      maxAge: LOGIN_FLOW_MAX_AGE,
    },
  );

  const authorizationUrl = oidc.buildAuthorizationUrl(client, {
    redirect_uri: settings.redirectUri,
    scope: "openid profile email",
    resource: settings.resource,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return sendRedirect(event, authorizationUrl.href);
});
