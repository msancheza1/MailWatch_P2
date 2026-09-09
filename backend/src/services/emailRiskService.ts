import { RiskClassifier } from './riskClassifier.js';
import type { RiskResult } from '../types/risk.types.js';

export class EmailRiskService {
  private readonly classifier: RiskClassifier;

  constructor() {
    this.classifier = new RiskClassifier();
  }

  analyzeRisk(score: number, reasons: string[]): RiskResult {
    return this.classifier.generateResult(score, reasons);
  }
}