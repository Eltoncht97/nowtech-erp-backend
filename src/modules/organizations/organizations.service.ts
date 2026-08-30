import { ConflictException, Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UnitOfWork } from 'src/core/database/unit-of-work/unit-of-work';

@Injectable()
export class OrganizationsService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async create(dto: CreateOrganizationDto) {
    // const existingOrganization = await this.organizationRepository.findBySlug(
    //   dto.slug,
    // );
    // if (existingOrganization) {
    //   throw new ConflictException(
    //     `Organization with slug ${dto.slug} already created`,
    //   );
    // }
    // return this.organizationRepository.create(dto);
  }
}
