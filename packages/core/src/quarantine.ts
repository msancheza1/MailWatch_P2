import type { AnalysisResult, AuditEntry, MailboxFolder, RiskLevel } from './types.js';

/** RF-05: solo lo malicioso se mueve automáticamente; lo sospechoso se queda visible. */
export function folderFor(level: RiskLevel): MailboxFolder {
  return level === 'malicious' ? 'quarantine' : 'inbox';
}

let auditCounter = 0;

export function auditEntry(
  emailId: string,
  action: AuditEntry['action'],
  detail: string,
  now: () => Date = () => new Date(),
): AuditEntry {
  auditCounter += 1;
  return {
    id: `audit-${auditCounter}`,
    emailId,
    action,
    detail,
    createdAt: now().toISOString(),
  };
}

const LEVEL_LABEL: Record<RiskLevel, string> = {
  safe: 'seguro',
  suspicious: 'sospechoso',
  malicious: 'malicioso',
};

/** RF-07 / RF-10: traza de lo que hizo el sistema con cada correo. */
export function auditFor(result: AnalysisResult, now?: () => Date): AuditEntry[] {
  const count = result.signals.length;
  const entries = [
    auditEntry(
      result.emailId,
      'analyzed',
      `Clasificado como ${LEVEL_LABEL[result.level]} con riesgo ${result.score}/100 ` +
        `(${count} ${count === 1 ? 'señal' : 'señales'}).`,
      now,
    ),
  ];
  if (folderFor(result.level) === 'quarantine') {
    entries.push(auditEntry(result.emailId, 'quarantined', 'Movido a cuarentena automáticamente.', now));
  }
  return entries;
}
