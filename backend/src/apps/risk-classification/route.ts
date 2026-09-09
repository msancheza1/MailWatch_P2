import { Body, Controller, Post } from '@nestjs/common';
import { EmailRiskService } from '../../services/emailRiskService.js';

interface RiskClassificationRequest {
  score: number;
  reasons: string[];
}

@Controller('risk-classification')
export class RiskClassificationController {
  constructor(private readonly service: EmailRiskService) {}

  @Post()
  classify(@Body() body: RiskClassificationRequest) {
    return this.service.analyzeRisk(body.score, body.reasons);
  }
}