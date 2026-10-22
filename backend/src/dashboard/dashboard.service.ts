import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getStats() {
    // Cuenta correos que tienen al menos un análisis.
    const emails = await this.database.query(`
      SELECT COUNT(DISTINCT email_id) AS count
      FROM analysis_results
    `);

    const threats = await this.database.query(`
      SELECT COUNT(*) AS count
      FROM analysis_results
      WHERE risk_level = 'HIGH'
    `);

    const quarantine = await this.database.query(`
      SELECT COUNT(*) AS count
      FROM quarantine
    `);

    return {
      emailsAnalyzed: Number(emails.rows[0].count),
      threatsBlocked: Number(threats.rows[0].count),
      quarantine: Number(quarantine.rows[0].count),
      protectionLevel:
        Number(threats.rows[0].count) > 0 ? 'HIGH' : 'LOW',
    };
  }

  async getRecent() {
    const result = await this.database.query(`
      SELECT
        e.sender,
        e.subject,
        a.risk_level,
        a.indicators
      FROM analysis_results a
      INNER JOIN emails e ON e.id = a.email_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 5
    `);

    return result.rows;
  }

  async getChart() {
    const result = await this.database.query(`
      SELECT
        DATE(created_at) AS date,
        risk_level,
        COUNT(*) AS count
      FROM analysis_results
      GROUP BY DATE(created_at), risk_level
      ORDER BY date
    `);

    return result.rows;
  }

  async getModelMetrics() {
    const result = await this.database.query(`
      SELECT
        COUNT(DISTINCT email_id)::int AS emails_analyzed,

        COUNT(*) FILTER (
          WHERE expected_risk_level IS NOT NULL
        )::int AS reviewed_analyses,

        COUNT(*) FILTER (
          WHERE expected_risk_level IS NOT NULL
            AND risk_level <> expected_risk_level
        )::int AS classification_errors,

        ROUND(
          100.0 * COUNT(*) FILTER (
            WHERE risk_level = 'HIGH'
              AND expected_risk_level = 'HIGH'
          )
          /
          NULLIF(
            COUNT(*) FILTER (
              WHERE risk_level = 'HIGH'
                AND expected_risk_level IS NOT NULL
            ),
            0
          ),
          2
        ) AS precision_percent

      FROM analysis_results
    `);

    const row = result.rows[0];

    return {
      emailsAnalyzed: Number(row.emails_analyzed),
      reviewedAnalyses: Number(row.reviewed_analyses),
      classificationErrors: Number(row.classification_errors),
      precision:
        row.precision_percent === null
          ? null
          : Number(row.precision_percent),
    };
  }
}