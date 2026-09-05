import { PasswordHasher } from '../../core/security/password-hasher.service';
import { CreateUserData } from './repositories/types/create-user-data.type';
import { ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';
import { User } from '@prisma/client';

describe('UsersService', () => {
  let userRepositoryMock: jest.Mocked<UserRepository>;
  let service: UsersService;

  const findByIdMock = jest.fn<Promise<User | null>, [string]>();
  const findByEmailMock = jest.fn<Promise<User | null>, [string]>();
  const createMock = jest.fn<Promise<User>, [CreateUserData]>();

  const dto: CreateUserDto = {
    name: 'User Mock',
    email: 'user-mock@email.com',
    password: 'A long test password',
  };

  const mockUser: User = {
    id: '1',
    name: 'User Mock',
    email: 'user-mock@email.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const hash = jest.fn<Promise<string>, [string]>();

  beforeEach(() => {
    findByIdMock.mockReset();
    findByEmailMock.mockReset();
    createMock.mockReset();

    userRepositoryMock = {
      findById: findByIdMock,
      findByEmail: findByEmailMock,
      create: createMock,
    };

    hash.mockReset().mockResolvedValue('hashed-password');
    service = new UsersService(userRepositoryMock, {
      hash,
    } as unknown as PasswordHasher);
  });

  it('should create a user when email does not exist', async () => {
    findByEmailMock.mockResolvedValue(null);
    createMock.mockResolvedValue(mockUser);

    const result = await service.create(dto);

    expect(findByEmailMock).toHaveBeenCalledWith(dto.email);
    expect(hash).toHaveBeenCalledWith(dto.password);
    expect(createMock).toHaveBeenCalledWith({
      name: dto.name,
      email: dto.email,
      passwordHash: 'hashed-password',
    });
    expect(result).toEqual({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('does not persist when hashing fails', async () => {
    findByEmailMock.mockResolvedValue(null);
    hash.mockRejectedValue(new Error('hash failed'));
    await expect(service.create(dto)).rejects.toThrow('hash failed');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when email already exists', async () => {
    findByEmailMock.mockResolvedValue(mockUser);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    expect(createMock).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });
});
