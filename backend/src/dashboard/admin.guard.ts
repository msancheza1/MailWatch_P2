import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { id: number };
    }>();

    // El AuthGuard global ya valida la sesión y coloca el usuario.
    if (!request.user) {
      throw new ForbiddenException('Acceso exclusivo para administradores.');
    }

    const result = await this.database.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [request.user.id],
    );

    if (result.rows[0]?.is_admin !== true) {
      throw new ForbiddenException('Acceso exclusivo para administradores.');
    }

    return true;
  }
}