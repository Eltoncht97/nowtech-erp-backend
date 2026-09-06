import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { MembershipStatus } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { PasswordHasher } from '../src/core/security/password-hasher.service';

type LoginResponse = {
  accessToken: string;
  organizations: { id: string; name: string }[];
};
type TokenPayload = { sub: string; iat: number; exp: number };

describe('Auth login (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let passwordHash: string;
  const email = 'login@example.com';
  const password = 'Login password 🔐';

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
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    passwordHash = await app.get(PasswordHasher).hash(password);
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

  function createUser(hash: string | null = passwordHash, userEmail = email) {
    return prisma.user.create({
      data: { name: 'Login User', email: userEmail, passwordHash: hash },
    });
  }

  function addOrganization(
    userId: string,
    name: string,
    slug: string,
    status: MembershipStatus,
  ) {
    return prisma.organization.create({
      data: { name, slug, memberships: { create: { userId, status } } },
    });
  }

  it('returns only active organization options and a signed JWT lasting exactly 30 minutes', async () => {
    const user = await createUser();
    const beta = await addOrganization(
      user.id,
      'Beta',
      'beta',
      MembershipStatus.ACTIVE,
    );
    const alpha = await addOrganization(
      user.id,
      'Alpha',
      'alpha',
      MembershipStatus.ACTIVE,
    );
    const alpha2 = await addOrganization(
      user.id,
      'Alpha',
      'alpha-2',
      MembershipStatus.ACTIVE,
    );
    await addOrganization(
      user.id,
      'Inactive',
      'inactive',
      MembershipStatus.INACTIVE,
    );
    await addOrganization(
      user.id,
      'Pending',
      'pending',
      MembershipStatus.PENDING,
    );
    const other = await createUser(passwordHash, 'other@example.com');
    await addOrganization(other.id, 'Other', 'other', MembershipStatus.ACTIVE);
    // An additional member must not duplicate the same organization in the result.
    await prisma.membership.create({
      data: {
        userId: other.id,
        organizationId: alpha.id,
        status: MembershipStatus.ACTIVE,
      },
    });

    const response = await request(server)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    const body = response.body as LoginResponse;
    expect(Object.keys(body).sort()).toEqual(['accessToken', 'organizations']);
    const alphas = [alpha, alpha2].sort((a, b) => a.id.localeCompare(b.id));
    expect(body.organizations).toEqual(
      [...alphas, beta].map(({ id, name }) => ({ id, name })),
    );
    const payload = await app
      .get(JwtService)
      .verifyAsync<TokenPayload>(body.accessToken);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(payload.sub).toBe(user.id);
    expect(payload.exp - payload.iat).toBe(1800);
    expect(Math.abs(payload.iat - Math.floor(Date.now() / 1000))).toBeLessThan(
      10,
    );
    expect(JSON.stringify(body)).not.toContain(passwordHash);
    expect(JSON.stringify(body)).not.toContain(password);
  });

  it.each(['missing', 'legacy', 'wrong', 'malformed'])(
    'rejects %s credentials with the same 401 response',
    async (scenario) => {
      if (scenario !== 'missing')
        await createUser(
          scenario === 'legacy'
            ? null
            : scenario === 'malformed'
              ? 'malformed-hash'
              : passwordHash,
        );
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email,
          password: scenario === 'wrong' ? 'wrong password' : password,
        })
        .expect(401);
      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      });
    },
  );

  it.each(['none', 'inactive only'])(
    'rejects users with %s organizations without a token',
    async (scenario) => {
      const user = await createUser();
      if (scenario === 'inactive only') {
        await addOrganization(
          user.id,
          'Inactive',
          'inactive',
          MembershipStatus.INACTIVE,
        );
        await addOrganization(
          user.id,
          'Pending',
          'pending',
          MembershipStatus.PENDING,
        );
      }
      const response = await request(server)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(403);
      expect(response.body).toEqual({
        statusCode: 403,
        message: 'User has no active organizations',
        error: 'Forbidden',
      });
    },
  );

  it.each([
    {},
    { email },
    { password },
    { email: 'invalid', password },
    { email, password: '' },
    { email, password: 123 },
    { email, password: 'a'.repeat(129) },
  ])('validates login payload %j', async (payload) => {
    await request(server).post('/api/auth/login').send(payload).expect(400);
  });
});
