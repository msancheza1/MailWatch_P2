import { Controller, Get, Post } from '@nestjs/common';
import { EmailService } from './email.service.js';

@Controller('emails')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('upload')
  async uploadDataset() {
    return this.emailService.loadDataset();
  }

  @Get()
  async findAll() {
    return this.emailService.getAllEmails();
  }
}
