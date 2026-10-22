import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DomainRule } from './rules/domain.rule.js';
import { UrlRule } from './rules/url.rule.js';
import { construirAlerta } from './alerta.js';
import { nivelPara } from './umbrales.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';

import { QuarantineService } from '../quarantine/quarantine.service.js';

@Injectable()
export class AnalysisService {
  private domainRule: DomainRule;
  private urlRule: UrlRule;

  constructor(
    private database: DatabaseService,
    private quarantine: QuarantineService,
    private configuracion: ConfiguracionService,
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

    // US-06: cuántos indicadores hacen falta para cada nivel lo decide la
    // sensibilidad que el usuario guardó, no una constante.
    const sensibilidad = await this.configuracion.obtenerSensibilidad();
    const riskLevel = nivelPara(indicators.length, sensibilidad);

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

      // US-06: se devuelve para que la interfaz pueda decir con qué
      // configuración se tomó esta decisión.
      sensibilidad,

      // US-09: nivel de riesgo y acción recomendada para la alerta.
      alerta: construirAlerta(riskLevel, status === 'quarantined'),
    };
  }
}
