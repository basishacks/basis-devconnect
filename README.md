# Basis DevConnect

Basis DevConnect is an authenticated Nuxt portal for browsing and registering Basis Auth OpenID Connect clients.

## Application registry

- Every signed-in user can list, register, and view applications.
- A new application's creator is stored as its first `role.ADMIN` owner.
- Only an application's admin owners can edit or delete it.
- Registration supports public PKCE clients and confidential clients.
- Confidential secrets are generated securely, stored as Basis Auth-compatible scrypt hashes, and shown only once.
- Basic edits cover the application name, client type, and redirect URIs. Existing scopes, resources, filters, consent settings, and owners are preserved.

The portal talks directly to the Basis Auth PostgreSQL database using the connection configured by `NUXT_BASIS_AUTH_DATABASE_URL`.

## Development

```bash
bun install
bun run dev
```

The development server listens on port 3006. Copy `.env.example` to `.env` and configure the Basis Auth OIDC client, session password, and database URL before signing in.

## Verification

```bash
bun run test
bun run typecheck
bun run lint
bun run build
```

Set `TEST_BASIS_AUTH_DATABASE_URL` to a disposable Basis Auth PostgreSQL database to enable the schema integration test. Its writes run inside a transaction that is always rolled back.
