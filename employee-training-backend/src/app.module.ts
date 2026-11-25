import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CoursesModule } from './courses.module.js';
import { DatabaseModule } from './database.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, CoursesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
