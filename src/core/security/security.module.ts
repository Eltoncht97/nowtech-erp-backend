import { Module } from '@nestjs/common';
import { PasswordHasher } from './password-hasher.service';

@Module({ providers: [PasswordHasher], exports: [PasswordHasher] })
export class SecurityModule {}
