import { PasswordHasher } from 'src/core/security/password-hasher.service';
import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
