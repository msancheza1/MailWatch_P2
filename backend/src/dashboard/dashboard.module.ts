import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { AdminGuard } from './admin.guard.js';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [DashboardService, AdminGuard],
})
export class DashboardModule {}