import type { RiskLevel, SignalCategory } from '@mailwatch/core';

/** Color de trazo y su fondo suave, para las etiquetas del mockup. */
export const LEVEL_COLOR: Record<RiskLevel, string> = {
  safe: '#16a34a',
  suspicious: '#b4761d',
  malicious: '#d64545',
};

export const LEVEL_SOFT: Record<RiskLevel, string> = {
  safe: '#dcfce7',
  suspicious: '#fdf2df',
  malicious: '#fde8e8',
};

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  safe: 'Seguro',
  suspicious: 'Sospechoso',
  malicious: 'Malicioso',
};

export const LEVEL_HEADLINE: Record<RiskLevel, string> = {
  safe: 'No encontramos señales de fraude',
  suspicious: 'Revísalo antes de responder',
  malicious: 'Este correo intenta engañarte',
};

export const CATEGORY_LABEL: Record<SignalCategory, string> = {
  sender: 'Remitente',
  domain: 'Dominio',
  links: 'Enlaces',
  attachments: 'Adjuntos',
  content: 'Contenido',
};

const TIME = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('es-CO', { weekday: 'short' });
const LONG = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * El dataset simulado tiene fechas fijas, así que «hoy» es el día del correo
 * más reciente y no la fecha del sistema. Sin esto la app diría siempre que
 * no ha llegado nada hoy.
 */
export function shortDate(iso: string, today: string): string {
  const date = new Date(iso);
  const sameDay = new Date(today).toDateString() === date.toDateString();
  return sameDay ? TIME.format(date) : DAY.format(date);
}

export function relativeDay(iso: string, today: string): string {
  const date = new Date(iso);
  const days = Math.round(
    (new Date(today).setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days === 0) return `Hoy, ${TIME.format(date)}`;
  if (days === 1) return `Ayer, ${TIME.format(date)}`;
  return `${DAY.format(date)}, ${TIME.format(date)}`;
}

export function weekday(iso: string): string {
  return WEEKDAY.format(new Date(iso)).replace('.', '');
}

export function longDate(iso: string): string {
  return LONG.format(new Date(iso));
}

export function timeOf(iso: string): string {
  return TIME.format(new Date(iso));
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}
