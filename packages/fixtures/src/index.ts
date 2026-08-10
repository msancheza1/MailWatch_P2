import type { EmailMessage } from '@mailwatch/core';
import dataset from './emails.json';

/**
 * US-01: dataset simulado que reemplaza a Gmail durante los sprints 1-N.
 * Cuando entre RF-12, `loadSimulatedEmails` se sustituye por el conector real
 * de Gmail y el resto de la aplicación no cambia.
 */
export const SIMULATED_EMAILS = dataset as EmailMessage[];

export function loadSimulatedEmails(): EmailMessage[] {
  return SIMULATED_EMAILS.map((email) => ({ ...email })).sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt),
  );
}
