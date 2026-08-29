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
