import { randomUUID } from "node:crypto";
import { createError, readBody, setResponseStatus } from "h3";
import type { ApplicationMutationResponse } from "~~/shared/types/applications";
import {
  applicationFromRow,
  generateClientSecret,
  hashClientSecret,
  parseApplicationInput,
  type ApplicationDatabaseRow,
  type ApplicationMetadata,
} from "~~/server/utils/applications";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const input = parseApplicationInput(await readBody(event));
  const clientId = randomUUID();
  const isPublic = input.clientType === "public";
  const clientSecret = isPublic ? undefined : generateClientSecret();
  const secretHash = clientSecret ? await hashClientSecret(clientSecret) : null;
  const { resource } = getBasisAuthSettings(event);
  const metadata: ApplicationMetadata = {
    name: input.name,
    owners: [{ id: session.user.id, role: "role.ADMIN" }],
    redirectUris: input.redirectUris,
    public: isPublic,
    scopes: ["openid", "profile", "email"],
  };

  try {
    const result = await getBasisAuthDatabase(
      event,
    ).query<ApplicationDatabaseRow>(
      `
        insert into oidc_clients (
          client_id,
          metadata,
          secret_hash,
          resources,
          require_consent,
          filter_mode,
          filter_content,
          updated_at
        )
        values ($1, $2::jsonb, $3, $4::jsonb, true, null, '[]'::jsonb, now())
        returning
          client_id as "clientId",
          metadata,
          resources,
          require_consent as "requireConsent",
          filter_mode as "filterMode",
          filter_content as "filterContent",
          updated_at as "updatedAt"
      `,
      [
        clientId,
        JSON.stringify(metadata),
        secretHash,
        JSON.stringify([resource]),
      ],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("Application insert did not return a row");
    }

    setResponseStatus(event, 201);
    return {
      application: applicationFromRow(row, session.user.id),
      ...(clientSecret ? { clientSecret } : {}),
    } satisfies ApplicationMutationResponse;
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 503,
      statusMessage: "Application registration is unavailable",
    });
  }
});
