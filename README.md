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

`POST /api/users` requires `name`, `email` and `password` (15–128 characters).
Passwords preserve whitespace and Unicode; no composition rules or default passwords
are applied. Responses contain only `id`, `name`, `email`, `createdAt`, and `updatedAt`.

The reusable `SecurityModule` exports `PasswordHasher.hash` and `verify`. It uses
Node's asynchronous scrypt with a random 16-byte salt, a 64-byte derived key,
and N=131072, r=8, p=1 (~128 MiB per operation; 256 MiB maxmem). The stored format
includes a version and fixed parameters. Verification rejects absent or malformed
hashes and compares derived keys in constant time. This uses Node's built-in crypto
without an additional native dependency, following the
[OWASP scrypt configuration](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
Capacity planning should account for the memory cost of concurrent hashing.

Existing nullable `passwordHash` values remain unchanged; no migration is required.
Login, JWT, password recovery, and invitations are outside this change.
