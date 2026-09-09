import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.PGHOST ?? 'localhost',

      port: Number(process.env.PGPORT ?? 5432),

      user: process.env.PGUSER ?? 'mailwatch',

      password: process.env.PGPASSWORD ?? 'mailwatch',

      database: process.env.PGDATABASE ?? 'mailwatch',
    });
  }

  async query(query: string, params?: any[]) {
    return this.pool.query(query, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
