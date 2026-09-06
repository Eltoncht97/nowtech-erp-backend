import { ConflictException, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PasswordHasher } from 'src/core/security/password-hasher.service';
import { UnitOfWork } from 'src/core/database/unit-of-work/unit-of-work';
import { UniqueConflictError } from 'src/core/database/unique-conflict.error';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async create(dto: OnboardingDto) {
    const passwordHash = await this.passwordHasher.hash(dto.password);
    const result = await this.unitOfWork
      .execute(async ({ users, organizations, memberships }) => {
        if (await users.findByEmail(dto.email))
          throw new UniqueConflictError('email');
        if (await organizations.findBySlug(dto.organization.slug))
          throw new UniqueConflictError('slug');
        const user = await users.create({
          name: dto.name,
          email: dto.email,
          passwordHash,
        });
        const organization = await organizations.create({
          name: dto.organization.name,
          slug: dto.organization.slug,
        });
        await memberships.create({
          userId: user.id,
          organizationId: organization.id,
          status: MembershipStatus.ACTIVE,
          role: MembershipRole.OWNER,
        });
        return {
          userId: user.id,
          organization: { id: organization.id, name: organization.name },
        };
      })
      .catch((error: unknown) => {
        if (error instanceof UniqueConflictError)
          throw new ConflictException(
            `${error.field === 'email' ? 'Email' : 'Organization slug'} already exists`,
          );
        throw error;
      });
    const accessToken = await this.jwtService.signAsync({ sub: result.userId });
    return { accessToken, organizations: [result.organization] };
  }
}
