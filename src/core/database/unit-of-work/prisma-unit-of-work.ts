import { Injectable } from '@nestjs/common';
import { UnitOfWork } from './unit-of-work';
import { PrismaService } from '../prisma.service';
import { UnitOfWorkRepositories } from './unit-of-work-repositories.type';
import { PrismaOrganizationRepository } from 'src/modules/organizations/repositories/prisma-organization.repository';
import { PrismaMembershipRepository } from 'src/modules/memberships/repositories/prisma-membership.repository';

@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  execute<T>(
    work: (repositories: UnitOfWorkRepositories) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const repositories = {
        organizations: new PrismaOrganizationRepository(tx),

        memberships: new PrismaMembershipRepository(tx),
      };

      return work(repositories);
    });
  }
}
