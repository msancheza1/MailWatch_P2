/// <reference types="vite/client" />

import type {
  AnalysisResult,
  AuditEntry,
  DomainPolicy,
  EmailMessage,
  Thresholds,
} from '@mailwatch/core';

export interface InboxSnapshot {
  emails: EmailMessage[];
  results: AnalysisResult[];
  audit: AuditEntry[];
  stats: { total: number; safe: number; suspicious: number; malicious: number; elapsedMs: number };
}

declare global {
  interface Window {
    /** Solo existe dentro de Electron; en el navegador el renderer calcula localmente. */
    mailwatch?: {
      platform: NodeJS.Platform;
      loadInbox: (thresholds?: Thresholds, policy?: DomainPolicy) => Promise<InboxSnapshot>;
    };
  }
}
