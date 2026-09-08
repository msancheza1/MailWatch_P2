import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [DatabaseModule],

  controllers: [AppController],

  providers: [],
})
export class AppModule {}
