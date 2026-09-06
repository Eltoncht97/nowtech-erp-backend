import { IsUUID } from 'class-validator';
import { OrganizationDetailsDto } from './organization-details.dto';

export class CreateOrganizationDto extends OrganizationDetailsDto {
  @IsUUID()
  userId!: string;
}
