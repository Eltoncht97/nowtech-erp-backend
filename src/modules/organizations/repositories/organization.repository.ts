import type { Organization } from '@prisma/client';
import { CreateOrganizationData } from './types/create-organization-data.type';

export abstract class OrganizationRepository {
  abstract findBySlug(slug: string): Promise<Organization | null>;
  abstract create(data: CreateOrganizationData): Promise<Organization>;
}
