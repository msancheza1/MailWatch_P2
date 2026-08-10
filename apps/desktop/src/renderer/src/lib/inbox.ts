import {
  analyzeBatch,
  auditFor,
  folderFor,
  type DomainPolicy,
  type Thresholds,
} from '@mailwatch/core';
import { loadSimulatedEmails } from '@mailwatch/fixtures';
import type { InboxSnapshot } from '../env.js';

/**
 * Mismo cálculo que hace el proceso principal, pero dentro del renderer.
 * Sirve para abrir la UI en el navegador (http://localhost:5173) sin levantar
 * Electron, que es como se trabaja más rápido en frontend.
 */
function localSnapshot(thresholds?: Thresholds, policy?: DomainPolicy): InboxSnapshot {
  const emails = loadSimulatedEmails();
  const start = performance.now();
  const results = analyzeBatch(emails, { ...(thresholds && { thresholds }), ...(policy && { policy }) });
  const elapsedMs = Math.round(performance.now() - start);

  return {
    emails,
    results,
    audit: results.flatMap((result) => auditFor(result)),
    stats: {
      total: results.length,
      safe: results.filter((r) => r.level === 'safe').length,
      suspicious: results.filter((r) => r.level === 'suspicious').length,
      malicious: results.filter((r) => folderFor(r.level) === 'quarantine').length,
      elapsedMs,
    },
  };
}

export function loadInbox(thresholds?: Thresholds, policy?: DomainPolicy): Promise<InboxSnapshot> {
  return window.mailwatch
    ? window.mailwatch.loadInbox(thresholds, policy)
    : Promise.resolve(localSnapshot(thresholds, policy));
}
