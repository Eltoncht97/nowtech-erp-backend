import { ActiveOrganization } from './types/active-organization.type';
import { Membership } from '@prisma/client';
import { CreateMembershipData } from './types/create-membership-data.type';

export abstract class MembershipRepository {
  abstract findActiveOrganizationsByUserId(
    userId: string,
  ): Promise<ActiveOrganization[]>;

  abstract create(data: CreateMembershipData): Promise<Membership>;
}
