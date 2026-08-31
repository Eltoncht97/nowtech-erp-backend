import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    return this.userRepository.create(dto);
  }
}
