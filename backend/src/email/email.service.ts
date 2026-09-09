import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import csv from 'csv-parser';

@Injectable()
export class EmailService {
  constructor(private database: DatabaseService) {}

  async loadDataset() {
    const filePath = path.join(
      process.cwd(),
      '..',
      'database',
      'seeds',
      'emails_dataset.csv',
    );

    // Read first so file errors and database failures reject the HTTP request.
    const content = await fs.promises.readFile(filePath);
    const parser = Readable.from([content]).pipe(csv());
    let inserted = 0;
    for await (const email of parser) {
      if (!email.sender || !email.subject || !email.content) continue;
      await this.database.query(
        `INSERT INTO emails (sender, recipient, subject, content, received_date, has_attachment)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          email.sender,
          email.recipient,
          email.subject,
          email.content,
          email.received_date,
          email.has_attachment === 'true',
        ],
      );
      inserted++;
    }
    return { message: 'Dataset cargado correctamente', inserted };
  }

  async getAllEmails() {
    const result = await this.database.query(
      `
            SELECT *
            FROM emails
            WHERE NOT EXISTS (SELECT 1 FROM quarantine q WHERE q.email_id = emails.id)
            ORDER BY id;

            `,
    );

    return result.rows;
  }
}
