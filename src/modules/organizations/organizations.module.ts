import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PrismaOrganizationRepository } from './repositories/prisma-organization.repository';
import { PrismaService } from 'src/core/database/prisma.service';
import { OrganizationRepository } from './repositories/organization.repository';

@Module({
  imports: [],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: OrganizationRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaOrganizationRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [OrganizationRepository],
})
export class OrganizationsModule {}
