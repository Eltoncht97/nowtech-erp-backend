import { PrismaClientLike } from 'src/core/database/types/prisma-client.type';
import { BranchRepository } from './branch.repository';
import { Branch } from '@prisma/client';
import { CreateBranchData } from './types/create-branch-data.type';

export class PrismaBranchRepository extends BranchRepository {
  constructor(private readonly client: PrismaClientLike) {
    super();
  }

  findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<Branch | null> {
    return this.client.branch.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
  }
  create(data: CreateBranchData): Promise<Branch> {
    return this.client.branch.create({ data });
  }
}
