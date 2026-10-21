import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    if (
      context.getClass() === AuthController &&
      context.getHandler() === AuthController.prototype.login
    )
      return true;
    const request = context.switchToHttp().getRequest();
    const match = /^Bearer ([a-f0-9]{64})$/.exec(
      request.headers.authorization ?? '',
    );
    if (!match)
      throw new UnauthorizedException('Inicia sesión para continuar.');
    request.user = await this.auth.authenticate(match[1]);
    request.sessionToken = match[1];
    return true;
  }
}
