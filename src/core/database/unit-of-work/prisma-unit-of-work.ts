import { Prisma } from '@prisma/client';
import { UniqueConflictError } from '../unique-conflict.error';
import { Injectable } from '@nestjs/common';
import { UnitOfWork } from './unit-of-work';
import { PrismaService } from '../prisma.service';
import { UnitOfWorkRepositories } from './unit-of-work-repositories.type';
import { PrismaOrganizationRepository } from 'src/modules/organizations/repositories/prisma-organization.repository';
import { PrismaMembershipRepository } from 'src/modules/memberships/repositories/prisma-membership.repository';
import { PrismaUserRepository } from 'src/modules/users/repositories/prisma-user.repository';

@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  execute<T>(
    work: (repositories: UnitOfWorkRepositories) => Promise<T>,
  ): Promise<T> {
    return this.prisma
      .$transaction(async (tx) => {
        const repositories = {
          organizations: new PrismaOrganizationRepository(tx),

          memberships: new PrismaMembershipRepository(tx),

          users: new PrismaUserRepository(tx),
        };

        return work(repositories);
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target: unknown = error.meta?.target;
          if (Array.isArray(target)) {
            if (target.includes('email'))
              throw new UniqueConflictError('email');
            if (target.includes('slug')) throw new UniqueConflictError('slug');
          }
        }
        throw error;
      });
  }
}
