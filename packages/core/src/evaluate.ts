import type { AnalysisResult, EmailMessage, RiskLevel } from './types.js';

/**
 * Medición de la calidad del detector.
 *
 * Aunque el producto clasifica en tres niveles (RF-03), la calidad se mide como
 * una decisión binaria, que es la pregunta que de verdad le importa al usuario:
 * «¿esto me puede hacer daño, sí o no?». Se miden dos preguntas distintas
 * porque tienen consecuencias distintas:
 *
 * - `amenaza`   → ¿el correo merece un aviso? (sospechoso o malicioso)
 * - `malicioso` → ¿el correo se manda a cuarentena? Aquí un falso positivo
 *                 esconde un correo legítimo, así que duele mucho más.
 */
export type Framing = 'amenaza' | 'malicioso';

export const FRAMING_LABEL: Record<Framing, string> = {
  amenaza: '¿Es una amenaza? (se avisa al usuario)',
  malicioso: '¿Es malicioso? (se manda a cuarentena)',
};

export function isPositive(level: RiskLevel, framing: Framing): boolean {
  return framing === 'malicioso' ? level === 'malicious' : level !== 'safe';
}

export interface ConfusionMatrix {
  /** Amenazas detectadas correctamente. */
  truePositives: number;
  /** Correos legítimos marcados por error: falsas alarmas. */
  falsePositives: number;
  /** Correos legítimos que pasaron sin ruido. */
  trueNegatives: number;
  /** Amenazas que se colaron. */
  falseNegatives: number;
}

export interface Metrics {
  /** De lo que marcamos, cuánto era de verdad amenaza. */
  precision: number;
  /** De todas las amenazas, cuántas alcanzamos a marcar. */
  recall: number;
  f1: number;
  /** Proporción de correos legítimos que marcamos por error. */
  falseAlarmRate: number;
  accuracy: number;
}

export interface Mistake {
  emailId: string;
  subject: string;
  score: number;
  expected: RiskLevel;
  got: RiskLevel;
  kind: 'falso positivo' | 'falso negativo';
}

export interface Evaluation {
  framing: Framing;
  matrix: ConfusionMatrix;
  metrics: Metrics;
  mistakes: Mistake[];
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

export function metricsOf(matrix: ConfusionMatrix): Metrics {
  const { truePositives, falsePositives, trueNegatives, falseNegatives } = matrix;
  const precision = ratio(truePositives, truePositives + falsePositives);
  const recall = ratio(truePositives, truePositives + falseNegatives);

  return {
    precision,
    recall,
    f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
    falseAlarmRate: 1 - ratio(trueNegatives, trueNegatives + falsePositives),
    accuracy: ratio(
      truePositives + trueNegatives,
      truePositives + trueNegatives + falsePositives + falseNegatives,
    ),
  };
}

/**
 * Compara la clasificación contra la etiqueta `groundTruth` del dataset.
 * Los correos sin etiqueta se ignoran: no se puede medir lo que no se conoce.
 */
export function evaluate(
  emails: readonly EmailMessage[],
  results: readonly AnalysisResult[],
  framing: Framing,
): Evaluation {
  const byId = new Map(results.map((result) => [result.emailId, result]));
  const matrix: ConfusionMatrix = {
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
  };
  const mistakes: Mistake[] = [];

  for (const email of emails) {
    const result = byId.get(email.id);
    if (!email.groundTruth || !result) continue;

    const shouldMark = isPositive(email.groundTruth, framing);
    const didMark = isPositive(result.level, framing);

    if (shouldMark && didMark) matrix.truePositives += 1;
    else if (!shouldMark && !didMark) matrix.trueNegatives += 1;
    else {
      matrix[didMark ? 'falsePositives' : 'falseNegatives'] += 1;
      mistakes.push({
        emailId: email.id,
        subject: email.subject,
        score: result.score,
        expected: email.groundTruth,
        got: result.level,
        kind: didMark ? 'falso positivo' : 'falso negativo',
      });
    }
  }

  return { framing, matrix, metrics: metricsOf(matrix), mistakes };
}
