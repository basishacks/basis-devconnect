import { createError, sendNoContent } from "h3";
import {
  canManageApplication,
  parseApplicationMetadata,
  parseClientId,
  type ApplicationDatabaseRow,
} from "~~/server/utils/applications";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const clientId = parseClientId(event);

  try {
    await withBasisAuthTransaction(event, async (database) => {
      const result = await database.query<ApplicationDatabaseRow>(
        `
          select
            client_id as "clientId",
            metadata,
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
      const application = result.rows[0];

      if (!application) {
        throw createError({
          statusCode: 404,
          statusMessage: "Application not found",
        });
      }

      const metadata = parseApplicationMetadata(application.metadata, clientId);
      if (!canManageApplication(metadata, session.user.id)) {
        throw createError({
          statusCode: 403,
          statusMessage: "Application administrator access is required",
        });
      }

      await database.query("delete from oidc_clients where client_id = $1", [
        clientId,
      ]);
    });

    return sendNoContent(event);
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 503,
      statusMessage: "Application deletion is unavailable",
    });
  }
});
