import { ConflictException, NotFoundException } from '@nestjs/common';
import { UnitOfWorkRepositories } from 'src/core/database/unit-of-work/unit-of-work-repositories.type';
import { UnitOfWork } from 'src/core/database/unit-of-work/unit-of-work';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import {
  Membership,
  MembershipStatus,
  MembershipRole,
  Organization,
  User,
} from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let repositoriesMock: UnitOfWorkRepositories;

  const findUserByIdMock = jest.fn();
  const findOrganizationBySlugMock = jest.fn();
  const createOrganizationMock = jest.fn();
  const createMembershipMock = jest.fn();

  const dto: CreateOrganizationDto = {
    name: 'Test Organization',
    slug: 'test-organization',
    userId: 'user-id',
  };

  const mockUser: User = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganization: Organization = {
    id: 'org-id',
    name: 'Test Organization',
    slug: 'test-organization',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership: Membership = {
    id: 'membership-id',
    userId: mockUser.id,
    organizationId: mockOrganization.id,
    status: MembershipStatus.ACTIVE,
    role: MembershipRole.OWNER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    findUserByIdMock.mockReset();
    findOrganizationBySlugMock.mockReset();
    createOrganizationMock.mockReset();
    createMembershipMock.mockReset();

    repositoriesMock = {
      users: {
        findById: findUserByIdMock,
        findByEmail: jest.fn(),
        create: jest.fn(),
      },
      organizations: {
        findById: jest.fn(),
        findBySlug: findOrganizationBySlugMock,
        create: createOrganizationMock,
      },
      memberships: {
        findActiveOrganizationsByUserId: jest.fn(),
        create: createMembershipMock,
      },
    };

    const unitOfWorkMock: UnitOfWork = {
      execute<T>(
        work: (repositories: UnitOfWorkRepositories) => Promise<T>,
      ): Promise<T> {
        return work(repositoriesMock);
      },
    };

    service = new OrganizationsService(unitOfWorkMock);
  });

  it('should throw NotFoundException when user does not exist', async () => {
    findUserByIdMock.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toThrow(NotFoundException);

    expect(findUserByIdMock).toHaveBeenCalledWith(dto.userId);
    expect(findOrganizationBySlugMock).not.toHaveBeenCalled();
    expect(createOrganizationMock).not.toHaveBeenCalled();
    expect(createMembershipMock).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when organization slug already exists', async () => {
    findUserByIdMock.mockResolvedValue(mockUser);
    findOrganizationBySlugMock.mockResolvedValue(mockOrganization);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);

    expect(findUserByIdMock).toHaveBeenCalledWith(dto.userId);
    expect(findOrganizationBySlugMock).toHaveBeenCalledWith(dto.slug);
    expect(createOrganizationMock).not.toHaveBeenCalled();
    expect(createMembershipMock).not.toHaveBeenCalled();
  });

  it('should create organization and membership when user exists and slug is unique', async () => {
    findUserByIdMock.mockResolvedValue(mockUser);
    findOrganizationBySlugMock.mockResolvedValue(null);
    createOrganizationMock.mockResolvedValue(mockOrganization);
    createMembershipMock.mockResolvedValue(mockMembership);

    const result = await service.create(dto);

    expect(findUserByIdMock).toHaveBeenCalledWith(dto.userId);
    expect(findOrganizationBySlugMock).toHaveBeenCalledWith(dto.slug);
    expect(createOrganizationMock).toHaveBeenCalledWith({
      name: dto.name,
      slug: dto.slug,
    });
    expect(createMembershipMock).toHaveBeenCalledWith({
      userId: dto.userId,
      organizationId: mockOrganization.id,
      status: MembershipStatus.ACTIVE,
      role: MembershipRole.OWNER,
    });
    expect(result).toEqual(mockOrganization);
  });

  it('should propagate error when membership creation fails', async () => {
    const membershipError = new Error('Membership creation failed');

    findUserByIdMock.mockResolvedValue(mockUser);
    findOrganizationBySlugMock.mockResolvedValue(null);
    createOrganizationMock.mockResolvedValue(mockOrganization);
    createMembershipMock.mockRejectedValue(membershipError);

    await expect(service.create(dto)).rejects.toThrow(membershipError);

    expect(createOrganizationMock).toHaveBeenCalledWith({
      name: dto.name,
      slug: dto.slug,
    });
    expect(createMembershipMock).toHaveBeenCalledWith({
      userId: dto.userId,
      organizationId: mockOrganization.id,
      status: MembershipStatus.ACTIVE,
      role: MembershipRole.OWNER,
    });
  });
});
