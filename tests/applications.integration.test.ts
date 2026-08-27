import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  generateClientSecret,
  hashClientSecret,
} from "../server/utils/applications";

const databaseUrl = process.env.TEST_BASIS_AUTH_DATABASE_URL;

test.skipIf(!databaseUrl)(
  "application records match the Basis Auth PostgreSQL schema",
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const database = await pool.connect();
    const clientId = randomUUID();
    const secretHash = await hashClientSecret(generateClientSecret());
    const metadata = {
      name: "DevConnect integration test",
      owners: [{ id: randomUUID(), role: "role.ADMIN" }],
      redirectUris: ["https://example.test/auth/callback"],
      public: false,
      scopes: ["openid", "profile", "email"],
    };

    try {
      await database.query("begin");
      const inserted = await database.query<{
        clientId: string;
        metadata: typeof metadata;
        secretHash: string | null;
      }>(
        `
          insert into oidc_clients (
            client_id,
            metadata,
            secret_hash,
            resources,
            require_consent,
            filter_mode,
            filter_content
          )
          values ($1, $2::jsonb, $3, $4::jsonb, true, null, '[]'::jsonb)
          returning
            client_id as "clientId",
            metadata,
            secret_hash as "secretHash"
        `,
        [
          clientId,
          JSON.stringify(metadata),
          secretHash,
          JSON.stringify(["urn:basis:api:test"]),
        ],
      );

      expect(inserted.rows[0]?.clientId).toBe(clientId);
      expect(inserted.rows[0]?.metadata.owners[0]?.role).toBe("role.ADMIN");
      expect(inserted.rows[0]?.secretHash).toStartWith("scrypt:");

      const updated = await database.query<{ secretHash: string | null }>(
        `
          update oidc_clients
          set metadata = jsonb_set(metadata, '{public}', 'true'::jsonb),
              secret_hash = null
          where client_id = $1
          returning secret_hash as "secretHash"
        `,
        [clientId],
      );
      expect(updated.rows[0]?.secretHash).toBeNull();
    } finally {
      await database.query("rollback");
      database.release();
      await pool.end();
    }
  },
);
