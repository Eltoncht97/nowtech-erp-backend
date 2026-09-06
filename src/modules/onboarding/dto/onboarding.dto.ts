import { Type } from 'class-transformer';
import { IsDefined, IsObject, ValidateNested } from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { OrganizationDetailsDto } from '../../organizations/dto/organization-details.dto';

export class OnboardingDto extends CreateUserDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationDetailsDto)
  organization!: OrganizationDetailsDto;
}
