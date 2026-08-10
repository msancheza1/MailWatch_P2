/**
 * Modelo de dominio de MailWatch.
 *
 * La forma de `EmailMessage` es deliberadamente un subconjunto de lo que
 * devuelve `users.messages.get` de la Gmail API (RF-12), para que el paso del
 * dataset simulado a Gmail real no obligue a reescribir el motor de análisis.
 */

export type RiskLevel = 'safe' | 'suspicious' | 'malicious';

/** Las cinco dimensiones que exige RF-02. */
export type SignalCategory =
  | 'sender'
  | 'domain'
  | 'links'
  | 'attachments'
  | 'content';

export interface EmailAddress {
  /** Nombre visible que muestra el cliente de correo, p. ej. "Bancolombia". */
  displayName: string;
  address: string;
}

export interface EmailLink {
  /** Texto del ancla tal como lo ve el usuario. */
  text: string;
  /** Destino real del enlace. */
  href: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface EmailMessage {
  id: string;
  /** ISO 8601. */
  receivedAt: string;
  from: EmailAddress;
  /** Dominio autenticado por SPF/DKIM; ausente si el correo no está firmado. */
  authenticatedDomain?: string;
  replyTo?: EmailAddress;
  to: EmailAddress[];
  subject: string;
  /** Cuerpo en texto plano. */
  body: string;
  links: EmailLink[];
  attachments: EmailAttachment[];
  /** Etiqueta de referencia del dataset simulado; nunca la usa el motor. */
  groundTruth?: RiskLevel;
}

/** Una evidencia concreta encontrada por una regla. */
export interface Signal {
  /** Identificador estable de la regla, p. ej. `links.display-mismatch`. */
  id: string;
  category: SignalCategory;
  /** Puntos de riesgo que aporta (positivo = más riesgo). */
  weight: number;
  /** Explicación en lenguaje natural para el usuario final (RF-04). */
  explanation: string;
  /** Fragmento del correo que disparó la regla. */
  evidence?: string;
}

export interface AnalysisResult {
  emailId: string;
  /** 0-100. */
  score: number;
  level: RiskLevel;
  signals: Signal[];
  /** Resumen legible construido a partir de las señales (RF-04). */
  summary: string;
  analyzedAt: string;
  /** Umbrales usados, para que el resultado sea reproducible y auditable. */
  thresholds: Thresholds;
}

/** RF-06 / RF-11: sensibilidad configurable por el usuario y por el admin. */
export interface Thresholds {
  suspicious: number;
  malicious: number;
}

export type SensitivityPreset = 'low' | 'balanced' | 'high';

export const SENSITIVITY_PRESETS: Record<SensitivityPreset, Thresholds> = {
  low: { suspicious: 45, malicious: 80 },
  balanced: { suspicious: 30, malicious: 65 },
  high: { suspicious: 20, malicious: 50 },
};

export const DEFAULT_THRESHOLDS = SENSITIVITY_PRESETS.balanced;

/** RF-05: destino del correo tras el análisis. */
export type MailboxFolder = 'inbox' | 'quarantine';

/** RF-08: corrección manual del usuario sobre una clasificación. */
export interface Feedback {
  emailId: string;
  reportedLevel: RiskLevel;
  comment?: string;
  createdAt: string;
}

/** RF-07 / RF-10: entrada del historial auditable. */
export interface AuditEntry {
  id: string;
  emailId: string;
  action: 'analyzed' | 'quarantined' | 'restored' | 'feedback';
  detail: string;
  createdAt: string;
}
