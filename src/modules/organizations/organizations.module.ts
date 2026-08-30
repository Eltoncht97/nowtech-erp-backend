import { Module } from '@nestjs/common';
import { OrganizationRepository } from './repositories/organization.repository';
import { PrismaOrganizationRepository } from './repositories/prisma-organization.repository';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: OrganizationRepository,
      useClass: PrismaOrganizationRepository,
    },
  ],
})
export class OrganizationsModule {}
