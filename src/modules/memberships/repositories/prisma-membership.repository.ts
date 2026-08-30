import { PrismaClientLike } from 'src/core/database/types/prisma-client.type';
import { CreateMembershipData } from './types/create-membership-data.type';
import { MembershipRepository } from './membership.repository';

export class PrismaMembershipRepository extends MembershipRepository {
  constructor(private readonly client: PrismaClientLike) {
    super();
  }

  create(data: CreateMembershipData) {
    return this.client.membership.create({
      data,
    });
  }
}
