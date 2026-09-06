# NowTech ERP Backend

Backend foundation for a multi-company ERP built with NestJS, PostgreSQL and Prisma.

## Sprint 0 foundation

- NestJS 11
- PostgreSQL 16 via Docker Compose
- Prisma
- Global environment configuration with Joi validation
- Global request validation
- Global database module
- Health endpoint
- Strict TypeScript configuration
- ESLint + Prettier

## Local setup

```bash
cp .env.example .env
npm install
docker compose up -d
npm run prisma:generate
npm run start:dev
```

Health check:

```text
GET http://localhost:3000/api/health
```

## Architecture direction

The application starts as a modular monolith. Domain modules will be introduced sprint by sprint. Multi-tenancy, organization membership and authorization are explicit architectural concerns and will not be implemented as ad-hoc user foreign keys.

Business modules from the personal finance project are intentionally not copied into this repository.

## User passwords

`POST /api/users` requires `name`, `email` and `password` (8–128 characters).
Passwords preserve whitespace and Unicode; no composition rules or default passwords
are applied. Responses contain only `id`, `name`, `email`, `createdAt`, and `updatedAt`.

The reusable `SecurityModule` exports `PasswordHasher.hash` and `verify`. It uses
the `argon2` library with Argon2id, `memoryCost: 19 * 1024` KiB (19 MiB),
`timeCost: 2`, and `parallelism: 1`, matching the
[OWASP minimum configuration](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id).
The library generates salts and encodes hashes. Verification returns false for
missing or malformed hashes. `PasswordHasher.verify(password, encodedHash)` delegates
to the library's `verify(encodedHash, password)`.

Existing nullable `passwordHash` values remain unchanged; no migration is required.
Password recovery and invitations are not implemented.

## Login

Set `JWT_SECRET` to a strong random secret in your local environment before starting
the application (for example, generate one with `openssl rand -hex 32`). There is
no default signing key. Existing `.env` files are not modified automatically.

`POST /api/auth/login` accepts `{ "email": "user@example.com", "password": "your password" }`.
Successful responses are HTTP 200 with `{ accessToken, organizations }`.
Organizations contain only `{ id, name }`, sorted by name then id, and include only
the user's ACTIVE memberships. The JWT contains `sub` (user id), `iat`, and `exp`,
with a lifetime of 30 minutes; organizations and credentials are not token claims.

Invalid credentials (including users without a password) return HTTP 401 with
`Invalid credentials`. Valid credentials without active organizations return
HTTP 403 with `User has no active organizations`, without issuing a token.
Login lists organization options; it does not select one or grant branch access.
JWT guards, authorization on other endpoints, refresh tokens and logout are not
implemented yet. E2E tests supply a separate test signing key.

## Organization onboarding and roles

`POST /api/onboarding` is public and accepts:

```json
{
  "name": "Founder",
  "email": "founder@example.com",
  "password": "your password",
  "organization": { "name": "Company", "slug": "company" }
}
```

User and nested organization fields use the same validation as their creation
endpoints. Password hashing happens before a single transaction creates the user,
organization, and ACTIVE/OWNER membership. Failure rolls back the transaction;
email and slug conflicts return HTTP 409, including concurrent uniqueness conflicts.
After commit, the endpoint returns HTTP 201 with `{ accessToken, organizations }`,
using the same 30-minute JWT configuration as login and only the newly created
organization's `{ id, name }`. No branch is created.

`MembershipRole` is required and organization-specific: OWNER, ADMIN, MEMBER.
Existing founder memberships migrate to OWNER; future writes must provide a role
explicitly (no database default). The existing organization creation endpoint also
creates an OWNER. Apply the new migration before running the updated application:

```bash
npx prisma migrate deploy
npm run prisma:generate
```

The migration preserves existing rows and does not change membership status.
Platform administrators, invitations, role-management endpoints and authorization
guards remain outside this implementation. If token signing fails after commit,
the account and organization remain created; the user can log in once signing is
available again.
