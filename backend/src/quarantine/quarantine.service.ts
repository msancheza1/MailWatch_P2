import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class QuarantineService {
  constructor(private readonly database: DatabaseService) {}

  async recordAnalysis(emailId: number, risk: string, indicators: string[]) {
    return this.database.transaction(async (client) => {
      // Serialize analyses of the same email and save analysis + isolation atomically.
      const email = await client.query(
        'SELECT id FROM emails WHERE id = $1 FOR UPDATE',
        [emailId],
      );
      if (!email.rowCount) throw new NotFoundException('Email not found');

      await client.query(
        'INSERT INTO analysis_results (email_id, risk_level, indicators) VALUES ($1, $2, $3)',
        [emailId, risk, JSON.stringify(indicators)],
      );
      if (risk === 'HIGH') {
        await client.query(
          `INSERT INTO quarantine (email_id, reason, indicators)
           VALUES ($1, $2, $3)
           ON CONFLICT (email_id) DO UPDATE
           SET reason = EXCLUDED.reason, indicators = EXCLUDED.indicators`,
          [
            emailId,
            'Correo clasificado como Malicious (riesgo alto).',
            JSON.stringify(indicators),
          ],
        );
        return 'quarantined' as const;
      }
      await client.query('DELETE FROM quarantine WHERE email_id = $1', [
        emailId,
      ]);
      return 'available' as const;
    });
  }

  async findAll() {
    const result = await this.database.query(
      `SELECT e.id, e.sender, e.subject, q.reason, q.indicators, q.quarantined_at
       FROM quarantine q JOIN emails e ON e.id = q.email_id
       ORDER BY q.quarantined_at DESC, e.id DESC`,
    );
    return result.rows;
  }
}
