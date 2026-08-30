import { MembershipStatus } from '@prisma/client';

export type CreateMembershipData = {
  userId: string;
  organizationId: string;
  status: MembershipStatus;
};
