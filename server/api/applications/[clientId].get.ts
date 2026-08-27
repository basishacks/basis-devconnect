import { createError } from "h3";
import {
  applicationFromRow,
  parseClientId,
  type ApplicationDatabaseRow,
} from "~~/server/utils/applications";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const clientId = parseClientId(event);

  try {
    const result = await getBasisAuthDatabase(
      event,
    ).query<ApplicationDatabaseRow>(
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
        limit 1
      `,
      [clientId],
    );
    const row = result.rows[0];

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: "Application not found",
      });
    }

    return applicationFromRow(row, session.user.id);
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 503,
      statusMessage: "Application details are unavailable",
    });
  }
});
