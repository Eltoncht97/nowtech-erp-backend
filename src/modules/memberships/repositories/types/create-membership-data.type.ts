import { MembershipStatus, MembershipRole } from '@prisma/client';

export type CreateMembershipData = {
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
};
