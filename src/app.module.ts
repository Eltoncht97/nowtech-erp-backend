import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { envValidationSchema } from './core/config/env.validation';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      cache: true,
    }),
    DatabaseModule,
    HealthModule,
    OrganizationsModule,
    UsersModule,
  ],
})
export class AppModule {}
