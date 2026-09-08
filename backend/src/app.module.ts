import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { EmailModule } from './email/email.module.js';
import { AnalysisModule } from './analysis/analysis.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';


@Module({
  imports: [DatabaseModule, EmailModule, AnalysisModule, DashboardModule],

  controllers: [],

  providers: [],
})
export class AppModule {}
