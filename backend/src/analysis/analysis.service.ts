import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { QuarantineService } from '../quarantine/quarantine.service.js';
import { DomainRule } from './rules/domain.rule.js';
import { UrlRule } from './rules/url.rule.js';
import { construirAlerta } from './alerta.js';
import { nivelPara } from './umbrales.js';

@Injectable()
export class AnalysisService {
  private readonly domainRule = new DomainRule();
  private readonly urlRule = new UrlRule();

  constructor(
    private readonly database: DatabaseService,
    private readonly quarantine: QuarantineService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  async analyzeEmail(emailId: number) {
    const result = await this.database.query(
      'SELECT * FROM emails WHERE id = $1',
      [emailId],
    );

    const email = result.rows[0];

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    const { indicators, sensibilidad, riskLevel } =
      await this.evaluateContent(email);

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
      sensibilidad,
      alerta: construirAlerta(riskLevel, status === 'quarantined'),
    };
  }

  async evaluateContent(email: {
    sender: string;
    subject: string;
    content: string;
  }) {
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

    const text = `${email.subject} ${email.content}`.toLowerCase();

    for (const word of suspiciousWords) {
      if (text.includes(word)) {
        indicators.push(`Keyword detected: ${word}`);
      }
    }

    indicators.push(...this.domainRule.analyze(email.sender));
    indicators.push(...this.urlRule.analyze(email.content));

    const sensibilidad = await this.configuracion.obtenerSensibilidad();
    const riskLevel = nivelPara(indicators.length, sensibilidad);

    return { indicators, sensibilidad, riskLevel };
  }
}