import { Membership } from '@prisma/client';
import { CreateMembershipData } from './types/create-membership-data.type';

export abstract class MembershipRepository {
  abstract create(data: CreateMembershipData): Promise<Membership>;
}
