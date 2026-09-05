import { User } from '@prisma/client';
import { UserRepository } from './user.repository';
import { PrismaClientLike } from 'src/core/database/types/prisma-client.type';
import { CreateUserData } from './types/create-user-data.type';

export class PrismaUserRepository extends UserRepository {
  constructor(private readonly client: PrismaClientLike) {
    super();
  }

  findById(id: string): Promise<User | null> {
    return this.client.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.client.user.findUnique({
      where: { email },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.client.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      },
    });
  }
}
