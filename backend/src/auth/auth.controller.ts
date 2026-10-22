import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email?: unknown; password?: unknown }) {
    return this.auth.login(body);
  }
  @Get('me')
  me(@Req() request: any) {
    return request.user;
  }
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: any) {
    await this.auth.logout(request.sessionToken);
  }
}
