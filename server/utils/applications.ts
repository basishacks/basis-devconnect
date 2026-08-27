import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { createError, getRouterParam, type H3Event } from "h3";
import type {
  ApplicationDetail,
  ApplicationInput,
  ApplicationSummary,
} from "../../shared/types/applications";

const scrypt = promisify(scryptCallback);

const MAX_CLIENT_ID_LENGTH = 200;
const MAX_NAME_LENGTH = 100;
const MAX_REDIRECT_URIS = 10;
const MAX_REDIRECT_URI_LENGTH = 2048;

export interface ApplicationOwner {
  id: string;
  role: string;
}

export interface ApplicationMetadata extends Record<string, unknown> {
  name: string;
  owners: ApplicationOwner[];
  redirectUris: string[];
  public: boolean;
  scopes: string[];
}

export interface ApplicationDatabaseRow {
  clientId: string;
  metadata: unknown;
  secretHash?: string | null;
  resources: unknown;
  requireConsent: boolean;
  filterMode: "whitelist" | "blacklist" | null;
  filterContent: unknown;
  updatedAt: Date | string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function parseApplicationMetadata(
  value: unknown,
  clientId: string,
): ApplicationMetadata {
  const metadata = isRecord(value) ? value : {};
  const owners = Array.isArray(metadata.owners)
    ? metadata.owners.flatMap((owner) => {
        if (
          !isRecord(owner) ||
          typeof owner.id !== "string" ||
          typeof owner.role !== "string"
        ) {
          return [];
        }

        return [{ id: owner.id, role: owner.role }];
      })
    : [];

  return {
    ...metadata,
    name:
      typeof metadata.name === "string" && metadata.name.trim()
        ? metadata.name
        : clientId,
    owners,
    redirectUris: stringArray(metadata.redirectUris),
    public: metadata.public === true,
    scopes: stringArray(metadata.scopes),
  };
}

export function canManageApplication(
  metadata: ApplicationMetadata,
  userId: string,
): boolean {
  return metadata.owners.some(
    (owner) => owner.id === userId && owner.role.toLowerCase() === "role.admin",
  );
}

export function applicationFromRow(
  row: ApplicationDatabaseRow,
  userId: string,
): ApplicationDetail {
  const metadata = parseApplicationMetadata(row.metadata, row.clientId);

  return {
    name: metadata.name,
    clientId: row.clientId,
    clientType: metadata.public ? "public" : "confidential",
    redirectUris: metadata.redirectUris,
    scopes: metadata.scopes,
    resources: stringArray(row.resources),
    requireConsent: row.requireConsent,
    filterMode: row.filterMode,
    filterContent: stringArray(row.filterContent),
    updatedAt: new Date(row.updatedAt).toISOString(),
    canManage: canManageApplication(metadata, userId),
  };
}

export function applicationSummaryFromRow(
  row: ApplicationDatabaseRow,
  userId: string,
): ApplicationSummary {
  const application = applicationFromRow(row, userId);

  return {
    name: application.name,
    clientId: application.clientId,
    clientType: application.clientType,
    updatedAt: application.updatedAt,
    canManage: application.canManage,
  };
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function parseRedirectUri(value: unknown): string {
  if (typeof value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URIs must be strings",
    });
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_REDIRECT_URI_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Redirect URIs must be between 1 and ${MAX_REDIRECT_URI_LENGTH} characters`,
    });
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URIs must be absolute URLs",
    });
  }

  if (url.hash) {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URIs cannot contain fragments",
    });
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLoopbackHostname(url.hostname))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Redirect URIs must use HTTPS, except for loopback development URLs",
    });
  }

  return url.href;
}

export function parseApplicationInput(value: unknown): ApplicationInput {
  if (!isRecord(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body must be an object",
    });
  }

  if (typeof value.name !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Application name is required",
    });
  }

  const name = value.name.trim();
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Application name must be between 1 and ${MAX_NAME_LENGTH} characters`,
    });
  }

  if (value.clientType !== "public" && value.clientType !== "confidential") {
    throw createError({
      statusCode: 400,
      statusMessage: "Client type must be public or confidential",
    });
  }

  if (
    !Array.isArray(value.redirectUris) ||
    value.redirectUris.length < 1 ||
    value.redirectUris.length > MAX_REDIRECT_URIS
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `Provide between 1 and ${MAX_REDIRECT_URIS} redirect URIs`,
    });
  }

  const redirectUris = value.redirectUris.map(parseRedirectUri);
  if (new Set(redirectUris).size !== redirectUris.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URIs must be unique",
    });
  }

  return { name, clientType: value.clientType, redirectUris };
}

export function parseClientId(event: H3Event): string {
  const clientId = getRouterParam(event, "clientId")?.trim();
  const containsControlCharacter = clientId
    ? [...clientId].some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127;
      })
    : false;
  if (
    !clientId ||
    clientId.length > MAX_CLIENT_ID_LENGTH ||
    containsControlCharacter
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Client ID is invalid",
    });
  }

  return clientId;
}

export function generateClientSecret(): string {
  return `sk_${randomBytes(32).toString("base64url")}`;
}

export async function hashClientSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const digest = (await scrypt(secret, salt, 64)) as Buffer;

  return `scrypt:${salt.toString("base64url")}:${digest.toString("base64url")}`;
}
