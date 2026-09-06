import { MembershipStatus } from '@prisma/client';
import { ActiveOrganization } from './types/active-organization.type';
import { PrismaClientLike } from 'src/core/database/types/prisma-client.type';
import { CreateMembershipData } from './types/create-membership-data.type';
import { MembershipRepository } from './membership.repository';

export class PrismaMembershipRepository extends MembershipRepository {
  constructor(private readonly client: PrismaClientLike) {
    super();
  }

  findActiveOrganizationsByUserId(
    userId: string,
  ): Promise<ActiveOrganization[]> {
    // Query organizations once, even if multiple matching relations exist.
    return this.client.organization.findMany({
      where: {
        memberships: { some: { userId, status: MembershipStatus.ACTIVE } },
      },
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  create(data: CreateMembershipData) {
    return this.client.membership.create({
      data,
    });
  }
}
