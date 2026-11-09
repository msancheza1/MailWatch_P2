import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class FeedbackService {
  constructor(private readonly database: DatabaseService) {}

  async report(emailId: number, userId: number, category: unknown) {
    if (!Number.isInteger(emailId) || emailId <= 0 || emailId > 2147483647) {
      throw new BadRequestException(
        'El identificador del correo no es válido.',
      );
    }
    if (category !== 'Safe' && category !== 'Malicious') {
      throw new BadRequestException('Selecciona Safe o Malicious.');
    }
    return this.database.transaction(async (client) => {
      // Share the same email lock as automatic analysis so the snapshot is consistent.
      const email = await client.query(
        'SELECT id FROM emails WHERE id = $1 FOR UPDATE',
        [emailId],
      );
      if (!email.rowCount) throw new NotFoundException('Correo no encontrado.');
      const analysis = (
        await client.query(
          `SELECT id, risk_level FROM analysis_results WHERE email_id = $1
         ORDER BY created_at DESC, id DESC LIMIT 1`,
          [emailId],
        )
      ).rows[0];
      if (!analysis)
        throw new ConflictException(
          'Analiza el correo antes de enviar retroalimentación.',
        );
      const previous = (
        await client.query(
          `SELECT * FROM email_feedback WHERE email_id = $1 AND user_id = $2
         ORDER BY id DESC LIMIT 1`,
          [emailId, userId],
        )
      ).rows[0];
      // Retries must not create duplicate reports for the same analysis and assessment.
      if (
        previous?.analysis_id === analysis.id &&
        previous.category === category
      )
        return previous;
      const reportType =
        category === 'Safe'
          ? analysis.risk_level === 'LOW'
            ? 'confirmation'
            : 'false_positive'
          : analysis.risk_level === 'HIGH'
            ? 'confirmation'
            : 'false_negative';
      const result = await client.query(
        `INSERT INTO email_feedback (email_id, user_id, analysis_id, original_risk, category, report_type)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          emailId,
          userId,
          analysis.id,
          analysis.risk_level,
          category,
          reportType,
        ],
      );
      return result.rows[0];
    });
  }

  async findMine(userId: number) {
    const result = await this.database.query(
      `SELECT DISTINCT ON (email_id) * FROM email_feedback
       WHERE user_id = $1 ORDER BY email_id, id DESC`,
      [userId],
    );
    return result.rows;
  }
}
