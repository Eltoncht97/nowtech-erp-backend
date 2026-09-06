import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PasswordHasher } from 'src/core/security/password-hasher.service';
import { UserRepository } from '../users/repositories/user.repository';
import { ActiveOrganization } from '../memberships/repositories/types/active-organization.type';
import { MembershipRepository } from '../memberships/repositories/membership.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user: User = {
    id: 'user-id',
    name: 'Test User',
    email: 'user@example.com',
    passwordHash: 'stored-hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const dto = { email: user.email, password: 'password' };
  const findByEmail = jest.fn<Promise<User | null>, [string]>();
  const findActiveOrganizations = jest.fn<
    Promise<ActiveOrganization[]>,
    [string]
  >();
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail,
    create: jest.fn(),
  };
  const memberships: jest.Mocked<MembershipRepository> = {
    create: jest.fn(),
    findActiveOrganizationsByUserId: findActiveOrganizations,
  };
  const hasher = new PasswordHasher();
  const jwt = new JwtService();
  const verify = jest.spyOn(hasher, 'verify');
  const sign = jest.spyOn(jwt, 'signAsync');
  const service = new AuthService(users, memberships, hasher, jwt);

  beforeEach(() => {
    jest.resetAllMocks();
    users.findByEmail.mockResolvedValue(user);
    verify.mockResolvedValue(true);
    sign.mockResolvedValue('access-token');
    memberships.findActiveOrganizationsByUserId.mockResolvedValue([
      { id: 'org-1', name: 'Alpha' },
      { id: 'org-2', name: 'Beta' },
    ]);
  });

  it('returns multiple organization options and signs only the user id', async () => {
    await expect(service.login(dto)).resolves.toEqual({
      accessToken: 'access-token',
      organizations: [
        { id: 'org-1', name: 'Alpha' },
        { id: 'org-2', name: 'Beta' },
      ],
    });
    expect(findByEmail).toHaveBeenCalledWith(dto.email);
    expect(verify).toHaveBeenCalledWith(dto.password, user.passwordHash);
    expect(findActiveOrganizations).toHaveBeenCalledWith(user.id);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledWith({ sub: user.id });
  });

  it.each(['missing user', 'legacy user', 'incorrect password'])(
    'rejects %s with the same generic error and never signs a token',
    async (scenario) => {
      if (scenario === 'missing user')
        users.findByEmail.mockResolvedValue(null);
      if (scenario === 'legacy user')
        users.findByEmail.mockResolvedValue({ ...user, passwordHash: null });
      if (scenario === 'incorrect password') verify.mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toEqual(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(findActiveOrganizations).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
      if (scenario !== 'incorrect password')
        expect(verify).not.toHaveBeenCalled();
    },
  );

  it('rejects users without active organizations without signing a token', async () => {
    memberships.findActiveOrganizationsByUserId.mockResolvedValue([]);
    await expect(service.login(dto)).rejects.toEqual(
      new ForbiddenException('User has no active organizations'),
    );
    expect(sign).not.toHaveBeenCalled();
  });
});
