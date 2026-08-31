import { User } from '@prisma/client';

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
}
