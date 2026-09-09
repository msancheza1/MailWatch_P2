import { Controller, Get } from '@nestjs/common';
import { QuarantineService } from './quarantine.service.js';

@Controller('quarantine')
export class QuarantineController {
  constructor(private readonly quarantine: QuarantineService) {}

  @Get()
  findAll() {
    return this.quarantine.findAll();
  }
}
