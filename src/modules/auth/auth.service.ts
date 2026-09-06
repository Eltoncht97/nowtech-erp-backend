import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordHasher } from 'src/core/security/password-hasher.service';
import { UserRepository } from '../users/repositories/user.repository';
import { MembershipRepository } from '../memberships/repositories/membership.repository';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (
      !user?.passwordHash ||
      !(await this.passwordHasher.verify(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const organizations =
      await this.memberships.findActiveOrganizationsByUserId(user.id);
    if (organizations.length === 0) {
      throw new ForbiddenException('User has no active organizations');
    }
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    return { accessToken, organizations };
  }
}
