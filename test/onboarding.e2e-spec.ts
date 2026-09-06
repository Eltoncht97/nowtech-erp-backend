import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { PasswordHasher } from '../src/core/security/password-hasher.service';
import { PrismaMembershipRepository } from '../src/modules/memberships/repositories/prisma-membership.repository';
import { PrismaUserRepository } from '../src/modules/users/repositories/prisma-user.repository';
import { PrismaOrganizationRepository } from '../src/modules/organizations/repositories/prisma-organization.repository';

type SessionResponse = {
  accessToken: string;
  organizations: { id: string; name: string }[];
};
type Claims = { sub: string; iat: number; exp: number };

describe('Onboarding (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  const dto = {
    name: 'Founder',
    email: 'founder@example.com',
    password: 'A password 🔐',
    organization: { name: 'Company', slug: 'company' },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    await prisma.branch.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  afterAll(async () => {
    await app.close();
  });

  async function counts() {
    return Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.membership.count(),
      prisma.branch.count(),
    ]);
  }

  it('creates one founder, organization and active owner, then supports login', async () => {
    const response = await request(server)
      .post('/api/onboarding')
      .send(dto)
      .expect(201);
    const body = response.body as SessionResponse;
    expect(await counts()).toEqual([1, 1, 1, 0]);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: dto.email },
    });
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { slug: dto.organization.slug },
    });
    const membership = await prisma.membership.findFirstOrThrow();
    expect(membership).toMatchObject({
      userId: user.id,
      organizationId: organization.id,
      status: MembershipStatus.ACTIVE,
      role: MembershipRole.OWNER,
    });
    await expect(
      app.get(PasswordHasher).verify(dto.password, user.passwordHash),
    ).resolves.toBe(true);
    expect(user.passwordHash).not.toBe(dto.password);
    expect(body).toEqual({
      accessToken: body.accessToken,
      organizations: [{ id: organization.id, name: organization.name }],
    });
    expect(body.accessToken).toEqual(expect.any(String));
    const claims = await app
      .get(JwtService)
      .verifyAsync<Claims>(body.accessToken);
    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(claims.sub).toBe(user.id);
    expect(claims.exp - claims.iat).toBe(1800);
    expect(JSON.stringify(body)).not.toContain(dto.password);
    expect(JSON.stringify(body)).not.toContain(user.passwordHash);
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: dto.email, password: dto.password })
      .expect(200);
    expect((login.body as SessionResponse).organizations).toEqual(
      body.organizations,
    );
  });

  it.each(['email', 'slug'])(
    'rejects duplicate %s with no partial writes',
    async (field) => {
      await request(server).post('/api/onboarding').send(dto).expect(201);
      const duplicate = {
        ...dto,
        email: field === 'email' ? dto.email : 'another@example.com',
        organization: {
          name: 'Another',
          slug: field === 'slug' ? dto.organization.slug : 'another',
        },
      };
      await request(server).post('/api/onboarding').send(duplicate).expect(409);
      expect(await counts()).toEqual([1, 1, 1, 0]);
    },
  );

  it.each(['email', 'slug'])(
    'handles a stale availability check and PostgreSQL unique conflict on %s',
    async (field) => {
      await request(server).post('/api/onboarding').send(dto).expect(201);
      jest
        .spyOn(PrismaUserRepository.prototype, 'findByEmail')
        .mockResolvedValue(null);
      jest
        .spyOn(PrismaOrganizationRepository.prototype, 'findBySlug')
        .mockResolvedValue(null);
      const sign = jest.spyOn(app.get(JwtService), 'signAsync');
      const duplicate = {
        ...dto,
        email: field === 'email' ? dto.email : 'another@example.com',
        organization: {
          name: 'Another',
          slug: field === 'slug' ? dto.organization.slug : 'another',
        },
      };
      const response = await request(server)
        .post('/api/onboarding')
        .send(duplicate)
        .expect(409);
      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message:
          field === 'email'
            ? 'Email already exists'
            : 'Organization slug already exists',
      });
      expect(await counts()).toEqual([1, 1, 1, 0]);
      expect(sign).not.toHaveBeenCalled();
    },
  );

  it('rolls back the user and organization when membership creation fails', async () => {
    jest
      .spyOn(PrismaMembershipRepository.prototype, 'create')
      .mockRejectedValueOnce(new Error('Simulated membership failure'));
    const sign = jest.spyOn(app.get(JwtService), 'signAsync');
    await request(server).post('/api/onboarding').send(dto).expect(500);
    expect(await counts()).toEqual([0, 0, 0, 0]);
    expect(sign).not.toHaveBeenCalled();
  });

  it.each([
    { ...dto, password: 'short' },
    { ...dto, email: 'invalid' },
    { ...dto, organization: undefined },
    { ...dto, organization: null },
    { ...dto, organization: { name: 'C', slug: 'Invalid Slug' } },
    { ...dto, organization: { ...dto.organization, userId: 'injected' } },
    { ...dto, organization: [] },
  ])('validates inherited and nested rules: %j', async (payload) => {
    await request(server).post('/api/onboarding').send(payload).expect(400);
    expect(await counts()).toEqual([0, 0, 0, 0]);
  });
});
