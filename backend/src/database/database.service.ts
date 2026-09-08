import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: 'localhost',

      port: 5432,

      user: 'postgres',

      password: 'postgres123',

      database: 'mailwatch',
    });
  }

  async query(query: string, params?: any[]) {
    return this.pool.query(query, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
