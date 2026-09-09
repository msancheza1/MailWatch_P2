import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DomainRule } from './rules/domain.rule.js';
import { UrlRule } from './rules/url.rule.js';

import { QuarantineService } from '../quarantine/quarantine.service.js';

@Injectable()
export class AnalysisService {
  private domainRule: DomainRule;
  private urlRule: UrlRule;

  constructor(
    private database: DatabaseService,
    private quarantine: QuarantineService,
  ) {
    this.domainRule = new DomainRule();
    this.urlRule = new UrlRule();
  }

  async analyzeEmail(emailId: number) {
    const result = await this.database.query(
      `
            SELECT *
            FROM emails
            WHERE id = $1
            `,

      [emailId],
    );

    const email = result.rows[0];

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    const indicators: string[] = [];

    const suspiciousWords = [
      'password',
      'verify',
      'urgent',
      'account',
      'login',
      'security',
      'reset',
    ];

    const text = (email.subject + ' ' + email.content).toLowerCase();

    suspiciousWords.forEach((word) => {
      if (text.includes(word)) {
        indicators.push(`Keyword detected: ${word}`);
      }
    });

    const domainIndicators = this.domainRule.analyze(email.sender);

    indicators.push(...domainIndicators);

    const urlIndicators = this.urlRule.analyze(email.content);

    indicators.push(...urlIndicators);

    let riskLevel = 'LOW';

    if (indicators.length >= 3) {
      riskLevel = 'HIGH';
    } else if (indicators.length > 0) {
      riskLevel = 'MEDIUM';
    }

    const status = await this.quarantine.recordAnalysis(
      emailId,
      riskLevel,
      indicators,
    );

    return {
      emailId,
      category:
        riskLevel === 'HIGH'
          ? 'Malicious'
          : riskLevel === 'MEDIUM'
            ? 'Suspicious'
            : 'Safe',
      status,

      risk: riskLevel,

      indicators,
    };
  }
}
