import { MembershipRepository } from 'src/modules/memberships/repositories/membership.repository';
import { OrganizationRepository } from 'src/modules/organizations/repositories/organization.repository';
import { UserRepository } from 'src/modules/users/repositories/user.repository';

export type UnitOfWorkRepositories = {
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
  users: UserRepository;
};
