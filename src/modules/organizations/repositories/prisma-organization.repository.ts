import { OrganizationRepository } from './organization.repository';
import { Organization } from '@prisma/client';
import { CreateOrganizationData } from './types/create-organization-data.type';
import { PrismaClientLike } from 'src/core/database/types/prisma-client.type';

export class PrismaOrganizationRepository extends OrganizationRepository {
  constructor(private readonly client: PrismaClientLike) {
    super();
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.client.organization.findUnique({ where: { slug } });
  }

  create(data: CreateOrganizationData): Promise<Organization> {
    return this.client.organization.create({ data });
  }
}
