import { ConflictException, NotFoundException } from '@nestjs/common';
import { Branch, Organization } from '@prisma/client';
import { BranchesService } from './branches.service';
import { BranchRepository } from './repositories/branch.repository';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';
import { CreateBranchDto } from './dto/create-branch.dto';

describe('BranchesService', () => {
  let service: BranchesService;

  const findBranchByOrganizationAndNameMock = jest.fn();
  const createBranchMock = jest.fn();
  const findOrganizationByIdMock = jest.fn();

  const organizationId = 'organization-id';

  const dto: CreateBranchDto = {
    name: 'Toby Store',
  };

  const mockOrganization: Organization = {
    id: organizationId,
    name: 'Now Tech',
    slug: 'now-tech',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBranch: Branch = {
    id: 'branch-id',
    name: dto.name,
    organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    findBranchByOrganizationAndNameMock.mockReset();
    createBranchMock.mockReset();
    findOrganizationByIdMock.mockReset();

    const branchRepositoryMock: BranchRepository = {
      findByOrganizationAndName: findBranchByOrganizationAndNameMock,
      create: createBranchMock,
    };

    const organizationRepositoryMock: OrganizationRepository = {
      findById: findOrganizationByIdMock,
      findBySlug: jest.fn(),
      create: jest.fn(),
    };

    service = new BranchesService(
      branchRepositoryMock,
      organizationRepositoryMock,
    );
  });

  it('should throw NotFoundException when organization does not exist', async () => {
    findOrganizationByIdMock.mockResolvedValue(null);

    await expect(service.create(organizationId, dto)).rejects.toThrow(
      NotFoundException,
    );

    expect(findOrganizationByIdMock).toHaveBeenCalledWith(organizationId);
    expect(findBranchByOrganizationAndNameMock).not.toHaveBeenCalled();
    expect(createBranchMock).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when branch name already exists in organization', async () => {
    findOrganizationByIdMock.mockResolvedValue(mockOrganization);
    findBranchByOrganizationAndNameMock.mockResolvedValue(mockBranch);

    await expect(service.create(organizationId, dto)).rejects.toThrow(
      ConflictException,
    );

    expect(findOrganizationByIdMock).toHaveBeenCalledWith(organizationId);
    expect(findBranchByOrganizationAndNameMock).toHaveBeenCalledWith(
      organizationId,
      dto.name,
    );
    expect(createBranchMock).not.toHaveBeenCalled();
  });

  it('should create branch when organization exists and name is unique', async () => {
    findOrganizationByIdMock.mockResolvedValue(mockOrganization);
    findBranchByOrganizationAndNameMock.mockResolvedValue(null);
    createBranchMock.mockResolvedValue(mockBranch);

    const result = await service.create(organizationId, dto);

    expect(findOrganizationByIdMock).toHaveBeenCalledWith(organizationId);
    expect(findBranchByOrganizationAndNameMock).toHaveBeenCalledWith(
      organizationId,
      dto.name,
    );
    expect(createBranchMock).toHaveBeenCalledWith({
      organizationId,
      name: dto.name,
    });
    expect(result).toEqual(mockBranch);
  });
});
