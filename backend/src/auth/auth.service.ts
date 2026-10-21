import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword, verifyPassword } from './password.js';
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword('invalid-user-placeholder');
  constructor(private readonly db: DatabaseService) {}
  async login(body: { email?: unknown; password?: unknown } | undefined) {
    if (
      typeof body?.email !== 'string' ||
      typeof body.password !== 'string' ||
      !body.email.trim() ||
      !body.password ||
      body.email.length > 254 ||
      body.password.length > 1024
    ) {
      throw new BadRequestException(
        'Ingresa un correo y una contraseña válidos.',
      );
    }
    const result = await this.db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [body.email.trim().toLowerCase()],
    );
    const user = result.rows[0];
    const valid = await verifyPassword(
      body.password,
      user?.password_hash ?? (await this.dummyHash),
    );
    if (!user || !valid)
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await this.db.query(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash(token), user.id, expiresAt],
    );
    return { token, expiresAt, user: { id: user.id, email: user.email } };
  }
  async authenticate(token: string) {
    const result = await this.db.query(
      'SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW()',
      [tokenHash(token)],
    );
    if (!result.rows[0])
      throw new UnauthorizedException(
        'La sesión expiró. Inicia sesión de nuevo.',
      );
    return result.rows[0];
  }
  async logout(token: string) {
    await this.db.query('DELETE FROM sessions WHERE token_hash = $1', [
      tokenHash(token),
    ]);
  }
}
