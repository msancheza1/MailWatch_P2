import type { RiskCategory, RiskResult } from '../types/risk.types.js';

export class RiskClassifier {
  classify(score: number): RiskCategory {
    if (score >= 70) {
      return 'Malicious';
    }

    if (score >= 40) {
      return 'Suspicious';
    }

    return 'Safe';
  }

  generateResult(score: number, reasons: string[]): RiskResult {
    return {
      score,
      category: this.classify(score),
      reasons,
    };
  }
}