import { analyzeAttachments } from './rules/attachments.js';
import { analyzeContent } from './rules/content.js';
import { analyzeDomain } from './rules/domain.js';
import { analyzeLinks } from './rules/links.js';
import { analyzeSender } from './rules/sender.js';
import { buildSummary } from './explain.js';
import { domainOf, registrableDomain } from './rules/util.js';
import {
  DEFAULT_THRESHOLDS,
  type AnalysisResult,
  type EmailMessage,
  type RiskLevel,
  type Signal,
  type Thresholds,
} from './types.js';

/**
 * Cada regla mira una dimensión distinta del correo (RF-02). El motor solo las
 * ejecuta y suma; añadir una regla nueva no obliga a tocar el motor.
 */
const RULES = [analyzeSender, analyzeDomain, analyzeLinks, analyzeAttachments, analyzeContent];

export function scoreToLevel(score: number, thresholds: Thresholds): RiskLevel {
  if (score >= thresholds.malicious) return 'malicious';
  if (score >= thresholds.suspicious) return 'suspicious';
  return 'safe';
}

/**
 * Dos señales de la misma dimensión suelen ser la misma evidencia vista dos
 * veces (un dominio falso dispara typosquatting y TLD sospechoso a la vez).
 * Por eso dentro de cada categoría la segunda señal aporta el 60 %, la tercera
 * el 36 %, y así. Las señales protectoras (peso negativo) no se descuentan.
 */
const CORRELATION_DECAY = 0.6;

function combine(signals: readonly Signal[]): number {
  const byCategory = new Map<string, Signal[]>();
  for (const signal of signals) {
    const bucket = byCategory.get(signal.category) ?? [];
    bucket.push(signal);
    byCategory.set(signal.category, bucket);
  }

  let total = 0;
  for (const bucket of byCategory.values()) {
    const positives = bucket.filter((s) => s.weight > 0).sort((a, b) => b.weight - a.weight);
    positives.forEach((signal, index) => {
      total += signal.weight * CORRELATION_DECAY ** index;
    });
    total += bucket.filter((s) => s.weight <= 0).reduce((sum, s) => sum + s.weight, 0);
  }
  return total;
}

/**
 * Listas del usuario (RF-11). Mandan sobre el puntaje: si alguien marcó un
 * dominio como de confianza es porque sabe algo que el motor no puede saber,
 * y al revés. Se aplican como decisión, no como puntos, para que el resultado
 * sea predecible: «lo pusiste tú en la lista» siempre gana.
 */
export interface DomainPolicy {
  trusted: readonly string[];
  blocked: readonly string[];
}

export interface AnalyzeOptions {
  thresholds?: Thresholds;
  policy?: DomainPolicy;
  /** Inyectable para que los tests produzcan resultados deterministas. */
  now?: () => Date;
}

function policyDecision(
  email: EmailMessage,
  policy: DomainPolicy | undefined,
): { level: RiskLevel; signal: Signal } | null {
  if (!policy) return null;
  const domain = registrableDomain(domainOf(email.from.address));
  const matches = (list: readonly string[]) =>
    list.some((entry) => registrableDomain(entry.trim().toLowerCase()) === domain);

  if (matches(policy.blocked)) {
    return {
      level: 'malicious',
      signal: {
        id: 'policy.blocked-domain',
        category: 'domain',
        weight: 0,
        explanation: `Tienes a ${domain} en tu lista de dominios bloqueados, así que este correo va directo a cuarentena sin importar su contenido.`,
        evidence: domain,
      },
    };
  }

  if (matches(policy.trusted)) {
    return {
      level: 'safe',
      signal: {
        id: 'policy.trusted-domain',
        category: 'domain',
        weight: 0,
        explanation: `Tienes a ${domain} en tu lista de dominios de confianza, así que nunca se marca como riesgo.`,
        evidence: domain,
      },
    };
  }

  return null;
}

/** RF-02 + RF-03 + RF-04: analiza, puntúa y explica un correo. */
export function analyzeEmail(email: EmailMessage, options: AnalyzeOptions = {}): AnalysisResult {
  const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;
  const now = options.now ?? (() => new Date());

  const signals: Signal[] = RULES.flatMap((rule) => rule(email));
  const score = Math.round(Math.max(0, Math.min(100, combine(signals))));

  const decision = policyDecision(email, options.policy);
  const level = decision ? decision.level : scoreToLevel(score, thresholds);
  const allSignals = decision ? [decision.signal, ...signals] : signals;

  return {
    emailId: email.id,
    score,
    level,
    signals: decision
      ? [decision.signal, ...[...signals].sort((a, b) => b.weight - a.weight)]
      : [...signals].sort((a, b) => b.weight - a.weight),
    summary: decision
      ? decision.signal.explanation
      : buildSummary(allSignals, score, level),
    analyzedAt: now().toISOString(),
    thresholds,
  };
}

export function analyzeBatch(
  emails: readonly EmailMessage[],
  options: AnalyzeOptions = {},
): AnalysisResult[] {
  return emails.map((email) => analyzeEmail(email, options));
}
