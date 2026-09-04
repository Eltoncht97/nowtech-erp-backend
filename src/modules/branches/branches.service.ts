import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchRepository } from './repositories/branch.repository';
import { CreateBranchDto } from './dto/create-branch.dto';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';

@Injectable()
export class BranchesService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async create(organizationId: string, dto: CreateBranchDto) {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingBranch =
      await this.branchRepository.findByOrganizationAndName(
        organizationId,
        dto.name,
      );

    if (existingBranch) {
      throw new ConflictException(
        `Branch with name ${dto.name} already exists in this organization`,
      );
    }

    return this.branchRepository.create({
      organizationId,
      name: dto.name,
    });
  }
}
