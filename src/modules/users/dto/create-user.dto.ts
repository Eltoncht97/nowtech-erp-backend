import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEmail,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(15)
  @MaxLength(128)
  password!: string;
}
