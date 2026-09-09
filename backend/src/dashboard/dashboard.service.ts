import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DashboardService {
  constructor(private database: DatabaseService) {}

  async getStats() {
    const emails = await this.database.query(
      `
        SELECT COUNT(*) 
        FROM emails
        `,
    );

    const threats = await this.database.query(
      `
        SELECT COUNT(*)
        FROM analysis_results
        WHERE risk_level='HIGH'
        `,
    );

    const quarantine = await this.database.query(
      `
        SELECT COUNT(*)
        FROM quarantine
        `,
    );

    return {
      emailsAnalyzed: Number(emails.rows[0].count),

      threatsBlocked: Number(threats.rows[0].count),

      quarantine: Number(quarantine.rows[0].count),

      protectionLevel: threats.rows[0].count > 0 ? 'HIGH' : 'LOW',
    };
  }

  async getRecent() {
    const result = await this.database.query(
      `
        SELECT
        e.sender,
        e.subject,
        a.risk_level,
        a.indicators

        FROM analysis_results a

        INNER JOIN emails e
        ON e.id=a.email_id

        ORDER BY a.created_at DESC

        LIMIT 5

        `,
    );

    return result.rows;
  }

  async getChart() {
    const result = await this.database.query(
      `
        SELECT
        DATE(created_at) AS date,
        risk_level,
        COUNT(*)

        FROM analysis_results

        GROUP BY
        DATE(created_at),
        risk_level

        ORDER BY date

        `,
    );

    return result.rows;
  }
}
