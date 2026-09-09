import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { AnalysisService } from './analysis.service.js';

@Controller('analysis')
export class AnalysisController {
  constructor(private analysisService: AnalysisService) {}

  @Post(':id')
  async analyze(@Param('id', ParseIntPipe) id: number) {
    return this.analysisService.analyzeEmail(id);
  }
}
