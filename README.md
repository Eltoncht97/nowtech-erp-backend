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
Login, JWT, password recovery, and invitations are outside this change.
