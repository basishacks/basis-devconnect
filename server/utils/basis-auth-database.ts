import { createError, type H3Event } from "h3";
import { Pool } from "pg";

let databasePool: Pool | undefined;

export function getBasisAuthDatabase(event: H3Event) {
  const { basisAuthDatabase } = useRuntimeConfig(event);

  if (!basisAuthDatabase.url) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing Basis Auth database URL",
    });
  }

  databasePool ??= new Pool({
    connectionString: basisAuthDatabase.url,
    application_name: "basis-devconnect",
    max: 5,
  });

  return databasePool;
}
