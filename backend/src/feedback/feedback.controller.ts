import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FeedbackService } from './feedback.service.js';

type AuthenticatedRequest = Request & { user: { id: number } };

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post(':id')
  report(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() body: { category?: unknown } | undefined,
  ) {
    return this.feedback.report(id, request.user.id, body?.category);
  }

  @Get()
  findMine(@Req() request: AuthenticatedRequest) {
    return this.feedback.findMine(request.user.id);
  }
}
