import { createError, readBody } from "h3";
import type { ApplicationMutationResponse } from "~~/shared/types/applications";
import {
  applicationFromRow,
  canManageApplication,
  generateClientSecret,
  hashClientSecret,
  parseApplicationInput,
  parseApplicationMetadata,
  parseClientId,
  type ApplicationDatabaseRow,
} from "~~/server/utils/applications";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const clientId = parseClientId(event);
  const input = parseApplicationInput(await readBody(event));

  try {
    return await withBasisAuthTransaction(event, async (database) => {
      const existingResult = await database.query<ApplicationDatabaseRow>(
        `
          select
            client_id as "clientId",
            metadata,
            secret_hash as "secretHash",
            resources,
            require_consent as "requireConsent",
            filter_mode as "filterMode",
            filter_content as "filterContent",
            updated_at as "updatedAt"
          from oidc_clients
          where client_id = $1
          for update
        `,
        [clientId],
      );
      const existing = existingResult.rows[0];

      if (!existing) {
        throw createError({
          statusCode: 404,
          statusMessage: "Application not found",
        });
      }

      const metadata = parseApplicationMetadata(existing.metadata, clientId);
      if (!canManageApplication(metadata, session.user.id)) {
        throw createError({
          statusCode: 403,
          statusMessage: "Application administrator access is required",
        });
      }

      const wasPublic = metadata.public;
      const isPublic = input.clientType === "public";
      let clientSecret: string | undefined;
      let secretHash = existing.secretHash ?? null;

      if (!wasPublic && isPublic) {
        secretHash = null;
      } else if (wasPublic && !isPublic) {
        clientSecret = generateClientSecret();
        secretHash = await hashClientSecret(clientSecret);
      }

      const nextMetadata = {
        ...metadata,
        name: input.name,
        redirectUris: input.redirectUris,
        public: isPublic,
      };
      const updatedResult = await database.query<ApplicationDatabaseRow>(
        `
          update oidc_clients
          set metadata = $2::jsonb,
              secret_hash = $3,
              updated_at = now()
          where client_id = $1
          returning
            client_id as "clientId",
            metadata,
            resources,
            require_consent as "requireConsent",
            filter_mode as "filterMode",
            filter_content as "filterContent",
            updated_at as "updatedAt"
        `,
        [clientId, JSON.stringify(nextMetadata), secretHash],
      );
      const updated = updatedResult.rows[0];
      if (!updated) {
        throw new Error("Application update did not return a row");
      }

      return {
        application: applicationFromRow(updated, session.user.id),
        ...(clientSecret ? { clientSecret } : {}),
      } satisfies ApplicationMutationResponse;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 503,
      statusMessage: "Application updates are unavailable",
    });
  }
});
