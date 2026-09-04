import { Branch } from '@prisma/client';
import { CreateBranchData } from './types/create-branch-data.type';

export abstract class BranchRepository {
  abstract findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<Branch | null>;

  abstract create(data: CreateBranchData): Promise<Branch>;
}
