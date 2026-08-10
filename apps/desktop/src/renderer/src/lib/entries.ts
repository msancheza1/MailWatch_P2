import type { AnalysisResult, EmailMessage, Signal } from '@mailwatch/core';

export interface Entry {
  email: EmailMessage;
  result: AnalysisResult;
}

/** El motivo que se muestra en la tabla de cuarentena: la señal de más peso. */
export function mainReason(result: AnalysisResult): string {
  const REASON: Record<string, string> = {
    'sender.display-name-mismatch': 'Suplantación de identidad',
    'sender.freemail-impersonation': 'Suplantación desde cuenta personal',
    'sender.auth-domain-mismatch': 'Firma de otro dominio',
    'sender.reply-to-mismatch': 'Respuesta desviada a otra dirección',
    'sender.unauthenticated': 'Remitente sin verificar',
    'domain.lookalike': 'Dominio imitador detectado',
    'domain.brand-combosquatting': 'Dominio falsificado',
    'domain.punycode': 'Dominio con caracteres engañosos',
    'domain.high-risk-tld': 'Dominio de alto riesgo',
    'links.display-mismatch': 'Enlace malicioso detectado',
    'links.brand-mismatch': 'Enlace fuera del sitio oficial',
    'links.ip-address': 'Enlace a una dirección IP',
    'links.insecure-login': 'Página de acceso sin cifrar',
    'links.shortener': 'Enlace acortado',
    'links.malformed': 'Enlace deformado',
    'attachments.executable': 'Adjunto ejecutable',
    'attachments.double-extension': 'Adjunto con extensión falsa',
    'attachments.web-page': 'Adjunto sospechoso',
    'attachments.macro-document': 'Documento con macros',
    'attachments.archive': 'Adjunto comprimido',
    'content.credential-request': 'Petición de credenciales',
    'content.sensitive-data-request': 'Petición de datos sensibles',
    'content.payment-redirect': 'Desvío de pago',
    'content.financial-lure': 'Premio o dinero inesperado',
    'content.threat': 'Amenaza al usuario',
    'content.urgency': 'Presión por urgencia',
    'content.generic-greeting': 'Saludo genérico',
    'policy.blocked-domain': 'Dominio bloqueado por ti',
    'policy.trusted-domain': 'Dominio de confianza',
  };

  const top: Signal | undefined = result.signals.find((signal) => signal.weight > 0) ?? result.signals[0];
  return top ? (REASON[top.id] ?? 'Comportamiento sospechoso') : 'Sin señales';
}

/** ¿La clasificación la decidió una lista del usuario y no el puntaje? */
export function decidedByPolicy(result: AnalysisResult): boolean {
  return result.signals.some((signal) => signal.id.startsWith('policy.'));
}

/**
 * El dataset simulado tiene fechas fijas. «Hoy» es el día del correo más
 * reciente, para que el panel no se vea siempre vacío.
 */
export function todayOf(emails: readonly EmailMessage[]): string {
  return emails.reduce<string>(
    (latest, email) => (email.receivedAt > latest ? email.receivedAt : latest),
    emails[0]?.receivedAt ?? new Date().toISOString(),
  );
}

export interface DayVolume {
  day: string;
  safe: number;
  suspicious: number;
  malicious: number;
}

/** Conteo por día y categoría para el gráfico del panel. */
export function volumeByDay(entries: readonly Entry[], today: string, days = 7): DayVolume[] {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (days - 1 - index));
    const key = date.toDateString();

    const ofDay = entries.filter((entry) => new Date(entry.email.receivedAt).toDateString() === key);
    return {
      day: date.toISOString(),
      safe: ofDay.filter((e) => e.result.level === 'safe').length,
      suspicious: ofDay.filter((e) => e.result.level === 'suspicious').length,
      malicious: ofDay.filter((e) => e.result.level === 'malicious').length,
    };
  });
}
