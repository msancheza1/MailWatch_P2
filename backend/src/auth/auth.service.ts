import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
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
  async register(body: { email?: unknown; password?: unknown } | undefined) {
    if (
      typeof body?.email !== 'string' ||
      typeof body.password !== 'string' ||
      body.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
      body.password.length < 8 ||
      body.password.length > 1024 ||
      !body.password.trim()
    ) {
      throw new BadRequestException(
        'Ingresa un correo válido y una contraseña de entre 8 y 1024 caracteres.',
      );
    }
    const email = body.email.trim().toLowerCase();
    // Recognize legacy accounts too, even if their stored email has uppercase letters.
    const existing = await this.db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [email],
    );
    if (existing.rows.length) {
      throw new ConflictException(
        'Este correo ya está registrado. Inicia sesión.',
      );
    }
    const passwordHash = await hashPassword(body.password);
    // The UNIQUE constraint resolves simultaneous registrations of the same email.
    const result = await this.db.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING RETURNING id, email`,
      [email, passwordHash],
    );
    if (!result.rows.length) {
      throw new ConflictException(
        'Este correo ya está registrado. Inicia sesión.',
      );
    }
    return { user: result.rows[0] };
  }
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
