import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

import * as fs from 'fs';
import * as path from 'path';
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

    const emails: any[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)

        .pipe(csv())

        .on('data', (row: Record<string, string>) => {
          emails.push(row);
        })

        .on('end', async () => {
          let inserted = 0;

          for (const email of emails) {
            if (!email.sender || !email.subject || !email.content) {
              continue;
            }

            await this.database.query(
              `
                        INSERT INTO emails
                        (
                            sender,
                            recipient,
                            subject,
                            content,
                            received_date,
                            has_attachment
                        )

                        VALUES
                        ($1,$2,$3,$4,$5,$6)

                        `,

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

          resolve({
            message: 'Dataset cargado correctamente',

            inserted,
          });
        })

        .on('error', (error: Error) => {
          reject(error);
        });
    });
  }

  async getAllEmails() {
    const result = await this.database.query(
      `
            SELECT *
            FROM emails
            ORDER BY id;

            `,
    );

    return result.rows;
  }
}
