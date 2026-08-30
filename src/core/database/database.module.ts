import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UnitOfWork } from './unit-of-work/unit-of-work';
import { PrismaUnitOfWork } from './unit-of-work/prisma-unit-of-work';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: UnitOfWork,
      useClass: PrismaUnitOfWork,
    },
  ],
  exports: [PrismaService, UnitOfWork],
})
export class DatabaseModule {}
