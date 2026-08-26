import { createError, type H3Event } from "h3";
import * as oidc from "openid-client";

interface BasisAuthSettings {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  resource: string;
}

let cachedKey = "";
let cachedClient: Promise<oidc.Configuration> | undefined;

function requiredSetting(name: string, value: unknown) {
  if (typeof value !== "string" || !value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing Basis Auth setting: ${name}`,
    });
  }

  return value;
}

export function getBasisAuthSettings(event: H3Event): BasisAuthSettings {
  const { basisAuth } = useRuntimeConfig(event);

  return {
    issuer: requiredSetting("issuer", basisAuth.issuer),
    clientId: requiredSetting("clientId", basisAuth.clientId),
    clientSecret: requiredSetting("clientSecret", basisAuth.clientSecret),
    redirectUri: requiredSetting("redirectUri", basisAuth.redirectUri),
    resource: requiredSetting("resource", basisAuth.resource),
  };
}

export async function getBasisAuthClient(event: H3Event) {
  const settings = getBasisAuthSettings(event);
  const key = JSON.stringify(settings);

  if (!cachedClient || cachedKey !== key) {
    cachedKey = key;
    const issuer = new URL(settings.issuer);
    const options =
      issuer.protocol === "http:"
        ? { execute: [oidc.allowInsecureRequests] }
        : undefined;

    cachedClient = oidc
      .discovery(
        issuer,
        settings.clientId,
        {
          redirect_uris: [settings.redirectUri],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_basic",
        },
        oidc.ClientSecretBasic(settings.clientSecret),
        options,
      )
      .catch((error) => {
        cachedClient = undefined;
        throw error;
      });
  }

  return {
    client: await cachedClient,
    settings,
  };
}
