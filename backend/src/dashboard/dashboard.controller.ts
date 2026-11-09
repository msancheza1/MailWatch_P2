import { Controller, Get, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service.js';
import { AdminGuard } from './admin.guard.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('recent')
  getRecent() {
    return this.dashboardService.getRecent();
  }

  @Get('chart')
  getChart() {
    return this.dashboardService.getChart();
  }

  @Get('model-metrics')
  @UseGuards(AdminGuard)
  getModelMetrics() {
    return this.dashboardService.getModelMetrics();
  }
}