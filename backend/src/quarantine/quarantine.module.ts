import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { QuarantineController } from './quarantine.controller.js';
import { QuarantineService } from './quarantine.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [QuarantineController],
  providers: [QuarantineService],
  exports: [QuarantineService],
})
export class QuarantineModule {}
