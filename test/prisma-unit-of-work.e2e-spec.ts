import { randomUUID } from 'node:crypto';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../src/core/database/prisma.service';
import { PrismaUnitOfWork } from '../src/core/database/unit-of-work/prisma-unit-of-work';

describe('PrismaUnitOfWork (integration)', () => {
  let prisma: PrismaService;
  let unitOfWork: PrismaUnitOfWork;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    unitOfWork = new PrismaUnitOfWork(prisma);
  });

  beforeEach(async () => {
    await prisma.branch.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rolls back organization creation when membership creation fails', async () => {
    const slug = 'rollback-organization';

    await expect(
      unitOfWork.execute(async ({ organizations, memberships }) => {
        const organization = await organizations.create({
          name: 'Rollback Organization',
          slug,
        });

        await memberships.create({
          organizationId: organization.id,
          userId: randomUUID(),
          status: MembershipStatus.ACTIVE,
        });
      }),
    ).rejects.toThrow();

    const persistedOrganization = await prisma.organization.findUnique({
      where: { slug },
    });

    expect(persistedOrganization).toBeNull();
    expect(await prisma.membership.count()).toBe(0);
  });

  it('commits all writes when the transaction succeeds', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Transaction User',
        email: 'transaction-user@example.com',
      },
    });

    const organization = await unitOfWork.execute(
      async ({ organizations, memberships }) => {
        const createdOrganization = await organizations.create({
          name: 'Committed Organization',
          slug: 'committed-organization',
        });

        await memberships.create({
          organizationId: createdOrganization.id,
          userId: user.id,
          status: MembershipStatus.ACTIVE,
        });

        return createdOrganization;
      },
    );

    const persistedOrganization = await prisma.organization.findUnique({
      where: { id: organization.id },
    });
    const persistedMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
    });

    expect(persistedOrganization).not.toBeNull();
    expect(persistedMembership).toEqual(
      expect.objectContaining({
        organizationId: organization.id,
        userId: user.id,
        status: MembershipStatus.ACTIVE,
      }),
    );
  });
});
