import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AnalysisService } from '../analysis/analysis.service.js';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

type SessionRequest = { sessionToken: string };

type AuthorizationAttempt = {
  state: string;
  verifier: string;
  expiresAt: number;
  used: boolean;
};

type GmailConnection = {
  accessToken: string;
  expiresAt: number;
};

type MessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string };
  parts?: MessagePart[];
};

type GmailMessage = {
  snippet?: string;
  payload?: MessagePart;
};

@Controller('gmail')
export class GmailController {
  private readonly attempts = new Map<string, AuthorizationAttempt>();
  private readonly connections = new Map<string, GmailConnection>();

  constructor(private readonly analysis: AnalysisService) {}

  private sessionKey(request: SessionRequest) {
    return createHash('sha256').update(request.sessionToken).digest('hex');
  }

  private clearExpired() {
    const now = Date.now();

    for (const [key, attempt] of this.attempts) {
      if (attempt.expiresAt <= now) this.attempts.delete(key);
    }

    for (const [key, connection] of this.connections) {
      if (connection.expiresAt <= now) this.connections.delete(key);
    }
  }

  private config() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException(
        'Falta configurar la conexión con Google en el backend.',
      );
    }

    return { clientId, clientSecret, redirectUri };
  }

  @Post('connect')
  @Header('Cache-Control', 'no-store')
  connect(@Req() request: SessionRequest) {
    const { clientId, redirectUri } = this.config();
    this.clearExpired();

    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');

    this.attempts.set(this.sessionKey(request), {
      state,
      verifier,
      expiresAt: Date.now() + 10 * 60_000,
      used: false,
    });

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      access_type: 'online',
      prompt: 'select_account',
    }).toString();

    return { url: url.toString() };
  }

  @Post('callback')
  @Header('Cache-Control', 'no-store')
  async callback(
    @Req() request: SessionRequest,
    @Body() body?: { code?: unknown; state?: unknown },
  ) {
    this.clearExpired();
    const key = this.sessionKey(request);
    const attempt = this.attempts.get(key);

    if (
      !attempt ||
      attempt.used ||
      body?.state !== attempt.state ||
      typeof body.code !== 'string' ||
      !body.code ||
      body.code.length > 4096
    ) {
      throw new BadRequestException(
        'La autorización es inválida o venció. Vuelve a conectar Gmail.',
      );
    }

    const { clientId, clientSecret, redirectUri } = this.config();
    attempt.used = true;

    try {
      const response = await this.requestGoogle(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code: body.code,
            code_verifier: attempt.verifier,
          }),
        },
      );

      if (!response.ok) {
        throw new BadRequestException(
          'Google rechazó la autorización. Vuelve a conectar Gmail.',
        );
      }

      const data = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
        scope?: string;
      };

      if (
        !data.access_token ||
        data.scope?.trim() !== GMAIL_SCOPE ||
        typeof data.expires_in !== 'number' ||
        !Number.isFinite(data.expires_in) ||
        data.expires_in <= 0
      ) {
        throw new BadRequestException(
          'Se requiere acceso de solo lectura a Gmail.',
        );
      }

      if (this.attempts.get(key) !== attempt) {
        throw new ConflictException('Se canceló o reemplazó la conexión.');
      }

      this.connections.set(key, {
        accessToken: data.access_token,
        expiresAt: Date.now() + Math.min(data.expires_in, 3600) * 1000,
      });

      return { connected: true };
    } finally {
      if (this.attempts.get(key) === attempt) this.attempts.delete(key);
    }
  }

  @Get('connection')
  @Header('Cache-Control', 'no-store')
  status(@Req() request: SessionRequest) {
    this.clearExpired();
    return { connected: this.connections.has(this.sessionKey(request)) };
  }

  @Delete('connection')
  disconnect(@Req() request: SessionRequest) {
    const key = this.sessionKey(request);
    this.attempts.delete(key);
    this.connections.delete(key);
    return { connected: false };
  }

  private requestGoogle(url: string, options: RequestInit) {
    return fetch(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    }).catch(() => {
      throw new BadGatewayException('No se pudo contactar a Google.');
    });
  }

  private async gmail<T>(request: SessionRequest, path: string): Promise<T> {
    this.clearExpired();
    const key = this.sessionKey(request);
    const connection = this.connections.get(key);

    if (!connection) {
      throw new ConflictException('Conecta Gmail para continuar.');
    }

    const response = await this.requestGoogle(`${GMAIL_API}${path}`, {
      headers: { Authorization: `Bearer ${connection.accessToken}` },
    });

    if (response.status === 401) {
      if (this.connections.get(key) === connection) this.connections.delete(key);
      throw new ConflictException('La autorización venció. Conecta Gmail de nuevo.');
    }

    if (!response.ok) {
      throw new BadGatewayException('Gmail no pudo completar la consulta.');
    }

    return (await response.json()) as T;
  }

  private header(part: MessagePart | undefined, name: string) {
    return (
      part?.headers?.find((header) => header.name.toLowerCase() === name)
        ?.value ?? ''
    );
  }

  @Get('messages')
  @Header('Cache-Control', 'no-store')
  async messages(@Req() request: SessionRequest) {
    const { messages = [] } = await this.gmail<{ messages?: { id: string }[] }>(
      request,
      '/messages?labelIds=INBOX&maxResults=5',
    );

    return Promise.all(
      messages.map(async ({ id }) => {
        const message = await this.gmail<GmailMessage>(
          request,
          `/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        );

        return {
          id,
          sender: this.header(message.payload, 'from'),
          subject: this.header(message.payload, 'subject') || '(Sin asunto)',
        };
      }),
    );
  }

  private messageText(part?: MessagePart): string {
    if (!part || part.filename || part.body?.attachmentId) return '';

    if (part.parts) {
      return part.parts.map((child) => this.messageText(child)).join('\n');
    }

    if (
      !part.body?.data ||
      !['text/plain', 'text/html'].includes(part.mimeType ?? '')
    ) {
      return '';
    }

    return Buffer.from(part.body.data.slice(0, 40_000), 'base64url').toString('utf8');
  }

  @Post('messages/:id/analyze')
  @Header('Cache-Control', 'no-store')
  async analyze(@Req() request: SessionRequest, @Param('id') id: string) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      throw new BadRequestException('Identificador de correo inválido.');
    }

    const message = await this.gmail<GmailMessage>(
      request,
      `/messages/${id}?format=full`,
    );

    return this.analysis.evaluateContent({
      sender: this.header(message.payload, 'from'),
      subject: this.header(message.payload, 'subject'),
      content: (this.messageText(message.payload) || message.snippet || '').slice(
        0,
        30_000,
      ),
    });
  }
}