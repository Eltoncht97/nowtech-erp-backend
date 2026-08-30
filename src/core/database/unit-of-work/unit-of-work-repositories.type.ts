import { MembershipRepository } from 'src/modules/memberships/repositories/membership.repository';
import { OrganizationRepository } from 'src/modules/organizations/repositories/organization.repository';

export type UnitOfWorkRepositories = {
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
};
