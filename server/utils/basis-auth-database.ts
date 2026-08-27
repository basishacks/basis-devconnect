import { createError, type H3Event } from "h3";
import { Pool, type PoolClient } from "pg";

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

export async function withBasisAuthTransaction<T>(
  event: H3Event,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getBasisAuthDatabase(event).connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
