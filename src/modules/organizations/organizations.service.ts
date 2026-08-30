import { ConflictException, Injectable } from '@nestjs/common';
import { OrganizationRepository } from './repositories/organization.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async create(dto: CreateOrganizationDto) {
    const existingOrganization = await this.organizationRepository.findBySlug(
      dto.slug,
    );

    if (existingOrganization) {
      throw new ConflictException(
        `Organization with slug ${dto.slug} already created`,
      );
    }

    return this.organizationRepository.create(dto);
  }
}
