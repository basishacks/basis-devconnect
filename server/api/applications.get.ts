import { createError, getQuery } from "h3";

const APPLICATIONS_PER_PAGE = 50;
const MAX_SEARCH_LENGTH = 100;

interface ApplicationRow {
  name: string;
  clientId: string;
  updatedAt: Date;
}

interface ApplicationCount {
  count: number;
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const query = getQuery(event);
  const page = query.page === undefined ? 1 : Number(query.page);
  const search = typeof query.search === "string" ? query.search.trim() : "";

  if (!Number.isSafeInteger(page) || page < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "Page must be a positive integer",
    });
  }

  if (search.length > MAX_SEARCH_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Search must be ${MAX_SEARCH_LENGTH} characters or fewer`,
    });
  }

  try {
    const database = getBasisAuthDatabase(event);
    const offset = (page - 1) * APPLICATIONS_PER_PAGE;
    const [applications, count] = await Promise.all([
      database.query<ApplicationRow>(
        `
          select
            coalesce(nullif(metadata->>'name', ''), client_id) as name,
            client_id as "clientId",
            updated_at as "updatedAt"
          from oidc_clients
          where $1 = ''
            or strpos(lower(coalesce(metadata->>'name', '')), lower($1)) > 0
          order by lower(coalesce(nullif(metadata->>'name', ''), client_id))
          limit $2
          offset $3
        `,
        [search, APPLICATIONS_PER_PAGE, offset],
      ),
      database.query<ApplicationCount>(
        `
          select count(*)::integer as count
          from oidc_clients
          where $1 = ''
            or strpos(lower(coalesce(metadata->>'name', '')), lower($1)) > 0
        `,
        [search],
      ),
    ]);

    const total = count.rows[0]?.count ?? 0;

    return {
      items: applications.rows,
      page,
      pageSize: APPLICATIONS_PER_PAGE,
      total,
      totalPages: Math.ceil(total / APPLICATIONS_PER_PAGE),
    };
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "Applications are unavailable",
    });
  }
});
