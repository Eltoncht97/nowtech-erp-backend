import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  MembershipRole,
  MembershipStatus,
  User,
  Organization,
  Membership,
} from '@prisma/client';
import { PasswordHasher } from 'src/core/security/password-hasher.service';
import { UnitOfWork } from 'src/core/database/unit-of-work/unit-of-work';
import { UnitOfWorkRepositories } from 'src/core/database/unit-of-work/unit-of-work-repositories.type';
import { UniqueConflictError } from 'src/core/database/unique-conflict.error';
import { CreateUserData } from '../users/repositories/types/create-user-data.type';
import { CreateOrganizationData } from '../organizations/repositories/types/create-organization-data.type';
import { CreateMembershipData } from '../memberships/repositories/types/create-membership-data.type';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const user: User = {
    id: 'user-id',
    name: 'Founder',
    email: 'founder@example.com',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const organization: Organization = {
    id: 'org-id',
    name: 'Company',
    slug: 'company',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const findEmail = jest.fn<Promise<User | null>, [string]>();
  const findSlug = jest.fn<Promise<Organization | null>, [string]>();
  const createUser = jest.fn<Promise<User>, [CreateUserData]>();
  const createOrg = jest.fn<Promise<Organization>, [CreateOrganizationData]>();
  const createMembership = jest.fn<
    Promise<Membership>,
    [CreateMembershipData]
  >();
  const repositories: UnitOfWorkRepositories = {
    users: { findById: jest.fn(), findByEmail: findEmail, create: createUser },
    organizations: {
      findById: jest.fn(),
      findBySlug: findSlug,
      create: createOrg,
    },
    memberships: {
      create: createMembership,
      findActiveOrganizationsByUserId: jest.fn(),
    },
  };
  const uow: UnitOfWork = { execute: async (work) => work(repositories) };
  const execute = jest.spyOn(uow, 'execute');
  const hasher = new PasswordHasher();
  const hash = jest.spyOn(hasher, 'hash');
  const jwt = new JwtService();
  const sign = jest.spyOn(jwt, 'signAsync');
  const service = new OnboardingService(uow, hasher, jwt);
  const dto = {
    name: user.name,
    email: user.email,
    password: 'a password',
    organization: { name: organization.name, slug: organization.slug },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    execute.mockImplementation(async (work) => work(repositories));
    findEmail.mockResolvedValue(null);
    findSlug.mockResolvedValue(null);
    createUser.mockResolvedValue(user);
    createOrg.mockResolvedValue(organization);
    hash.mockResolvedValue('hash');
    sign.mockResolvedValue('token');
  });

  it('hashes before the transaction, creates an active owner and signs only after commit', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      accessToken: 'token',
      organizations: [{ id: organization.id, name: organization.name }],
    });
    expect(hash).toHaveBeenCalledWith(dto.password);
    expect(hash.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[0],
    );
    expect(createUser).toHaveBeenCalledWith({
      name: dto.name,
      email: dto.email,
      passwordHash: 'hash',
    });
    expect(createOrg).toHaveBeenCalledWith(dto.organization);
    expect(createMembership).toHaveBeenCalledWith({
      userId: user.id,
      organizationId: organization.id,
      status: MembershipStatus.ACTIVE,
      role: MembershipRole.OWNER,
    });
    expect(sign).toHaveBeenCalledWith({ sub: user.id });
    expect(createMembership.mock.invocationCallOrder[0]).toBeLessThan(
      sign.mock.invocationCallOrder[0],
    );
  });

  it.each(['email', 'slug'])(
    'rejects an existing %s before writing',
    async (field) => {
      if (field === 'email') findEmail.mockResolvedValue(user);
      else findSlug.mockResolvedValue(organization);
      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(createUser).not.toHaveBeenCalled();
      expect(createOrg).not.toHaveBeenCalled();
      expect(createMembership).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
    },
  );

  it.each(['email', 'slug'] as const)(
    'maps transaction uniqueness races for %s to 409',
    async (field) => {
      execute.mockRejectedValue(new UniqueConflictError(field));
      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(sign).not.toHaveBeenCalled();
    },
  );

  it('never signs when a transaction fails after all writes', async () => {
    execute.mockImplementation(async (work) => {
      await work(repositories);
      throw new Error('commit failed');
    });
    await expect(service.create(dto)).rejects.toThrow('commit failed');
    expect(createMembership).toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });

  it('does not open a transaction when hashing fails', async () => {
    hash.mockRejectedValue(new Error('hash failed'));
    await expect(service.create(dto)).rejects.toThrow('hash failed');
    expect(execute).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });
});
