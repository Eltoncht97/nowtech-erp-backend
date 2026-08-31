import { User } from '@prisma/client';
import { UserRepository } from './user.repository';
import { PrismaClientLike } from 'src/core/database/types/prisma-client.type';

export class PrismaUserRepository extends UserRepository {
  constructor(private readonly client: PrismaClientLike) {
    super();
  }

  findById(id: string): Promise<User | null> {
    return this.client.user.findUnique({ where: { id } });
  }
}
