import { Module } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '../auth/auth.guard.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CoursesController],
  providers: [CoursesService, AuthGuard, RolesGuard],
})
export class CoursesModule {}
