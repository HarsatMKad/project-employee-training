import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: () => new DatabaseService(),
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
