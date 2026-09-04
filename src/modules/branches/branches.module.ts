import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchRepository } from './repositories/branch.repository';
import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaBranchRepository } from './repositories/prisma-branch.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BranchesController } from './branches.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [BranchesController],
  providers: [
    BranchesService,
    {
      provide: BranchRepository,
      useFactory: (prisma: PrismaService) => new PrismaBranchRepository(prisma),
      inject: [PrismaService],
    },
  ],
})
export class BranchesModule {}
