import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from './organization.repository';
import { Organization } from '@prisma/client';
import { CreateOrganizationData } from './types/create-organization-data.type';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class PrismaOrganizationRepository extends OrganizationRepository {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.prismaService.organization.findUnique({ where: { slug } });
  }

  create(data: CreateOrganizationData): Promise<Organization> {
    return this.prismaService.organization.create({ data });
  }
}
