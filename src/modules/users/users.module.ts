import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaUserRepository } from './repositories/prisma-user.repository';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: UserRepository,
      useFactory: (prisma: PrismaService) => new PrismaUserRepository(prisma),
      inject: [PrismaService],
    },
  ],
})
export class UsersModule {}
