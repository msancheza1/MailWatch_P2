import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';

@Controller()
export class AppController {
  constructor(private database: DatabaseService) {}

  @Get()
  async test() {
    const result = await this.database.query('SELECT NOW();');

    return result.rows;
  }
}
