import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthGuard, RolesGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { DatabaseModule } from './database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
