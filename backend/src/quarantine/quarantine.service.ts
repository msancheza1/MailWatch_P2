import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class QuarantineService {
  constructor(private readonly database: DatabaseService) {}

  async recordAnalysis(
    emailId: number,
    risk: string,
    indicators: string[],
  ) {
    return this.database.transaction(async (client) => {
      const email = await client.query(
        'SELECT id FROM emails WHERE id = $1 FOR UPDATE',
        [emailId],
      );

      if (!email.rowCount) {
        throw new NotFoundException('Email not found');
      }

      await client.query(
        `INSERT INTO analysis_results
          (email_id, risk_level, indicators)
         VALUES ($1, $2, $3)`,
        [emailId, risk, JSON.stringify(indicators)],
      );

      if (risk === 'HIGH') {
        await client.query(
          `INSERT INTO quarantine (email_id, reason, indicators)
           VALUES ($1, $2, $3)
           ON CONFLICT (email_id) DO UPDATE
           SET reason = EXCLUDED.reason,
               indicators = EXCLUDED.indicators,
               quarantined_at = CURRENT_TIMESTAMP`,
          [
            emailId,
            'Correo clasificado como Malicious (riesgo alto).',
            JSON.stringify(indicators),
          ],
        );

        return 'quarantined' as const;
      }

      await client.query(
        'DELETE FROM quarantine WHERE email_id = $1',
        [emailId],
      );

      return 'available' as const;
    });
  }

  async findAll() {
    const result = await this.database.query(`
      SELECT
        e.id,
        e.sender,
        e.subject,
        e.content,
        q.reason,
        q.indicators,
        q.quarantined_at,
        COALESCE(jsonb_array_length(q.indicators), 0) AS indicator_count
      FROM quarantine q
      JOIN emails e ON e.id = q.email_id
      ORDER BY q.quarantined_at DESC, e.id DESC
    `);

    return result.rows.map((email) => ({
      ...email,
      riskScore: Math.min(Number(email.indicator_count) * 30, 100),
    }));
  }

  async findOne(emailId: number) {
    const result = await this.database.query(
      `SELECT
         e.id,
         e.sender,
         e.subject,
         e.content,
         q.reason,
         q.indicators,
         q.quarantined_at
       FROM quarantine q
       JOIN emails e ON e.id = q.email_id
       WHERE e.id = $1`,
      [emailId],
    );

    if (!result.rowCount) {
      throw new NotFoundException('Email not found in quarantine');
    }

    const email = result.rows[0];

    return {
      ...email,
      riskScore: Math.min(
        (email.indicators?.length ?? 0) * 30,
        100,
      ),
    };
  }

  async release(emailId: number) {
    const result = await this.database.query(
      'DELETE FROM quarantine WHERE email_id = $1 RETURNING email_id',
      [emailId],
    );

    if (!result.rowCount) {
      throw new NotFoundException('Email not found in quarantine');
    }

    return {
      message: 'Correo liberado de cuarentena',
      emailId,
    };
  }

  async remove(emailId: number) {
    const result = await this.database.query(
      `DELETE FROM emails
       WHERE id = $1
       AND EXISTS (
         SELECT 1 FROM quarantine WHERE email_id = $1
       )
       RETURNING id`,
      [emailId],
    );

    if (!result.rowCount) {
      throw new NotFoundException('Email not found in quarantine');
    }

    return {
      message: 'Correo eliminado',
      emailId,
    };
  }
}