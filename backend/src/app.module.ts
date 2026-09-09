import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { EmailModule } from './email/email.module.js';
import { AnalysisModule } from './analysis/analysis.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RiskClassificationController } from './apps/risk-classification/route.js';
import { EmailRiskService } from './services/emailRiskService.js';


@Module({
  imports: [DatabaseModule, EmailModule, AnalysisModule, DashboardModule],

  controllers: [AppController, RiskClassificationController],

  providers: [AppService, EmailRiskService],
})
export class AppModule {}
