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
  const createMock = jest.fn<Promise<User>, [CreateUserDto]>();

  const dto: CreateUserDto = {
    name: 'User Mock',
    email: 'user-mock@email.com',
  };

  const mockUser: User = {
    id: '1',
    name: 'User Mock',
    email: 'user-mock@email.com',
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    findByIdMock.mockReset();
    findByEmailMock.mockReset();
    createMock.mockReset();

    userRepositoryMock = {
      findById: findByIdMock,
      findByEmail: findByEmailMock,
      create: createMock,
    };

    service = new UsersService(userRepositoryMock);
  });

  it('should create a user when email does not exist', async () => {
    findByEmailMock.mockResolvedValue(null);
    createMock.mockResolvedValue(mockUser);

    const result = await service.create(dto);

    expect(findByEmailMock).toHaveBeenCalledWith(dto.email);
    expect(createMock).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockUser);
  });

  it('should throw ConflictException when email already exists', async () => {
    findByEmailMock.mockResolvedValue(mockUser);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
    expect(createMock).not.toHaveBeenCalled();
  });
});
