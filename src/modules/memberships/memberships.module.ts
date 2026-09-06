import { Module } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { MembershipRepository } from './repositories/membership.repository';
import { PrismaMembershipRepository } from './repositories/prisma-membership.repository';

@Module({
  providers: [
    {
      provide: MembershipRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaMembershipRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [MembershipRepository],
})
export class MembershipsModule {}
