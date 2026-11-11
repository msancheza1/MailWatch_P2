import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { QuarantineService } from './quarantine.service.js';

@Controller('quarantine')
export class QuarantineController {
  constructor(private readonly quarantine: QuarantineService) {}

  @Get()
  findAll() {
    return this.quarantine.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quarantine.findOne(id);
  }

  @Post(':id/release')
  release(@Param('id', ParseIntPipe) id: number) {
    return this.quarantine.release(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.quarantine.remove(id);
  }
}