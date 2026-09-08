import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

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
}
