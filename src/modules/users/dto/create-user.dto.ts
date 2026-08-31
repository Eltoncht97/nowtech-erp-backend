import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;
}
