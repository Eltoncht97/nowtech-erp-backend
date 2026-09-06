import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UnitOfWork } from 'src/core/database/unit-of-work/unit-of-work';
import { MembershipRole, MembershipStatus } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async create(dto: CreateOrganizationDto) {
    const { userId, ...organizationData } = dto;
    return this.unitOfWork.execute(
      async ({ organizations, memberships, users }) => {
        const existingUser = await users.findById(userId);

        if (!existingUser) {
          throw new NotFoundException('User not found');
        }

        const existingOrganization = await organizations.findBySlug(dto.slug);

        if (existingOrganization) {
          throw new ConflictException(
            `Organization with slug ${dto.slug} already created`,
          );
        }

        const organization = await organizations.create(organizationData);

        await memberships.create({
          userId,
          organizationId: organization.id,
          status: MembershipStatus.ACTIVE,
          role: MembershipRole.OWNER,
        });

        return organization;
      },
    );
  }
}
