import { Controller, Post, Param } from '@nestjs/common';
import { AnalysisService } from './analysis.service.js';

@Controller('analysis')
export class AnalysisController {
  constructor(private analysisService: AnalysisService) {}

  @Post(':id')
  async analyze(@Param('id') id: string) {
    return this.analysisService.analyzeEmail(Number(id));
  }
}
