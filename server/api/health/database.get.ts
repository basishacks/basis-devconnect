import { createError } from "h3";

interface DatabaseConnection {
  database: string;
  user: string;
}

export default defineEventHandler(async (event) => {
  try {
    const database = getBasisAuthDatabase(event);
    const result = await database.query<DatabaseConnection>(
      'select current_database() as database, current_user as "user"',
    );

    return {
      status: "ok",
      database: result.rows[0]?.database,
      user: result.rows[0]?.user,
    };
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "Basis Auth database is unavailable",
    });
  }
});
