import { Module } from '@nestjs/common';

import { AnalysisController } from './analysis.controller.js';
import { AnalysisService } from './analysis.service.js';

import { DatabaseModule } from '../database/database.module.js';
import { QuarantineModule } from '../quarantine/quarantine.module.js';

@Module({
  imports: [DatabaseModule, QuarantineModule],

  controllers: [AnalysisController],

  providers: [AnalysisService],
})
export class AnalysisModule {}
