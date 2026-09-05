import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

type UserResponse = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
};

type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
};

type BranchResponse = {
  id: string;
  name: string;
  organizationId: string;
};

describe('Core API (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    httpServer = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.branch.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUser(
    email = 'e2e-user@example.com',
    name = 'E2E User',
  ): Promise<UserResponse> {
    const response = await request(httpServer)
      .post('/api/users')
      .send({ name, email })
      .expect(201);

    return response.body as UserResponse;
  }

  async function createOrganization(
    userId: string,
    slug = 'e2e-organization',
    name = 'E2E Organization',
  ): Promise<OrganizationResponse> {
    const response = await request(httpServer)
      .post('/api/organizations')
      .send({ name, slug, userId })
      .expect(201);

    return response.body as OrganizationResponse;
  }

  describe('POST /api/users', () => {
    it('creates a user', async () => {
      const response = await request(httpServer)
        .post('/api/users')
        .send({
          name: 'Elton Test',
          email: 'elton.e2e@example.com',
        })
        .expect(201);

      const body = response.body as UserResponse;

      expect(body).toEqual(
        expect.objectContaining({
          name: 'Elton Test',
          email: 'elton.e2e@example.com',
          passwordHash: null,
        }),
      );
      expect(body.id).toEqual(expect.any(String));

      const persistedUser = await prisma.user.findUnique({
        where: { email: 'elton.e2e@example.com' },
      });
      expect(persistedUser).not.toBeNull();
    });

    it('returns 400 when payload is invalid', async () => {
      await request(httpServer)
        .post('/api/users')
        .send({ name: '', email: 'not-an-email' })
        .expect(400);

      expect(await prisma.user.count()).toBe(0);
    });

    it('returns 409 when email already exists', async () => {
      await createUser('duplicate@example.com');

      await request(httpServer)
        .post('/api/users')
        .send({ name: 'Another User', email: 'duplicate@example.com' })
        .expect(409);

      expect(await prisma.user.count()).toBe(1);
    });
  });

  describe('POST /api/organizations', () => {
    it('creates an organization and its active membership', async () => {
      const user = await createUser();

      const response = await request(httpServer)
        .post('/api/organizations')
        .send({
          name: 'NowTech E2E',
          slug: 'nowtech-e2e',
          userId: user.id,
        })
        .expect(201);

      const body = response.body as OrganizationResponse;

      expect(body).toEqual(
        expect.objectContaining({
          name: 'NowTech E2E',
          slug: 'nowtech-e2e',
        }),
      );

      const membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: body.id,
            userId: user.id,
          },
        },
      });

      expect(membership).toEqual(
        expect.objectContaining({
          organizationId: body.id,
          userId: user.id,
          status: MembershipStatus.ACTIVE,
        }),
      );
    });

    it('returns 400 when organization payload is invalid', async () => {
      const user = await createUser();

      await request(httpServer)
        .post('/api/organizations')
        .send({
          name: 'N',
          slug: 'Invalid Slug',
          userId: user.id,
        })
        .expect(400);

      expect(await prisma.organization.count()).toBe(0);
      expect(await prisma.membership.count()).toBe(0);
    });

    it('returns 404 when user does not exist', async () => {
      await request(httpServer)
        .post('/api/organizations')
        .send({
          name: 'Missing User Org',
          slug: 'missing-user-org',
          userId: randomUUID(),
        })
        .expect(404);

      expect(await prisma.organization.count()).toBe(0);
      expect(await prisma.membership.count()).toBe(0);
    });

    it('returns 409 when slug already exists', async () => {
      const user = await createUser();
      await createOrganization(user.id, 'duplicate-org');

      await request(httpServer)
        .post('/api/organizations')
        .send({
          name: 'Another Organization',
          slug: 'duplicate-org',
          userId: user.id,
        })
        .expect(409);

      expect(await prisma.organization.count()).toBe(1);
      expect(await prisma.membership.count()).toBe(1);
    });
  });

  describe('POST /api/organizations/:organizationId/branches', () => {
    it('creates a branch for an existing organization', async () => {
      const user = await createUser();
      const organization = await createOrganization(user.id);

      const response = await request(httpServer)
        .post(`/api/organizations/${organization.id}/branches`)
        .send({ name: 'Main Branch' })
        .expect(201);

      const body = response.body as BranchResponse;

      expect(body).toEqual(
        expect.objectContaining({
          name: 'Main Branch',
          organizationId: organization.id,
        }),
      );
      expect(await prisma.branch.count()).toBe(1);
    });

    it('returns 400 when branch payload is invalid', async () => {
      const user = await createUser();
      const organization = await createOrganization(user.id);

      await request(httpServer)
        .post(`/api/organizations/${organization.id}/branches`)
        .send({ name: '' })
        .expect(400);

      expect(await prisma.branch.count()).toBe(0);
    });

    it('returns 400 when organization id is not a UUID', async () => {
      await request(httpServer)
        .post('/api/organizations/not-a-uuid/branches')
        .send({ name: 'Main Branch' })
        .expect(400);

      expect(await prisma.branch.count()).toBe(0);
    });

    it('returns 404 when organization does not exist', async () => {
      await request(httpServer)
        .post(`/api/organizations/${randomUUID()}/branches`)
        .send({ name: 'Main Branch' })
        .expect(404);

      expect(await prisma.branch.count()).toBe(0);
    });

    it('returns 409 when branch name already exists in the organization', async () => {
      const user = await createUser();
      const organization = await createOrganization(user.id);
      const endpoint = `/api/organizations/${organization.id}/branches`;

      await request(httpServer)
        .post(endpoint)
        .send({ name: 'Main Branch' })
        .expect(201);

      await request(httpServer)
        .post(endpoint)
        .send({ name: 'Main Branch' })
        .expect(409);

      expect(await prisma.branch.count()).toBe(1);
    });

    it('allows the same branch name in different organizations', async () => {
      const firstUser = await createUser('first@example.com', 'First User');
      const secondUser = await createUser('second@example.com', 'Second User');
      const firstOrganization = await createOrganization(
        firstUser.id,
        'first-organization',
        'First Organization',
      );
      const secondOrganization = await createOrganization(
        secondUser.id,
        'second-organization',
        'Second Organization',
      );

      await request(httpServer)
        .post(`/api/organizations/${firstOrganization.id}/branches`)
        .send({ name: 'Central' })
        .expect(201);

      await request(httpServer)
        .post(`/api/organizations/${secondOrganization.id}/branches`)
        .send({ name: 'Central' })
        .expect(201);

      expect(await prisma.branch.count()).toBe(2);
    });
  });
});
