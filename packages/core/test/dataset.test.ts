import { describe, expect, it } from 'vitest';
import { loadSimulatedEmails } from '@mailwatch/fixtures';
import { analyzeBatch, analyzeEmail } from '../src/engine.js';
import { folderFor } from '../src/quarantine.js';
import { SENSITIVITY_PRESETS } from '../src/types.js';

const emails = loadSimulatedEmails();

describe('US-01 · carga del dataset simulado', () => {
  it('carga los 48 correos ordenados del más reciente al más antiguo', () => {
    expect(emails).toHaveLength(48);
    const dates = emails.map((e) => e.receivedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('cubre las tres categorías de riesgo', () => {
    const counts = emails.reduce<Record<string, number>>((acc, e) => {
      acc[e.groundTruth!] = (acc[e.groundTruth!] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts.safe).toBeGreaterThanOrEqual(20);
    expect(counts.suspicious).toBeGreaterThanOrEqual(8);
    expect(counts.malicious).toBeGreaterThanOrEqual(14);
  });
});

describe('US-03 · clasificación contra el dataset etiquetado', () => {
  const results = analyzeBatch(emails);

  it('acierta la etiqueta esperada en los 30 correos', () => {
    const errors = results
      .map((result, i) => ({ result, expected: emails[i]!.groundTruth }))
      .filter(({ result, expected }) => result.level !== expected)
      .map(({ result, expected }) => `${result.emailId}: esperado ${expected}, obtenido ${result.level} (${result.score})`);

    expect(errors).toEqual([]);
  });

  it('nunca clasifica un correo legítimo como malicioso', () => {
    const falsePositives = results.filter(
      (r, i) => emails[i]!.groundTruth === 'safe' && r.level === 'malicious',
    );
    expect(falsePositives).toHaveLength(0);
  });

  it('siempre entrega una explicación no vacía (RF-04)', () => {
    for (const result of results) {
      expect(result.summary.length).toBeGreaterThan(30);
    }
  });
});

describe('US-05 · cuarentena automática', () => {
  it('solo envía a cuarentena lo clasificado como malicioso', () => {
    for (const result of analyzeBatch(emails)) {
      expect(folderFor(result.level)).toBe(result.level === 'malicious' ? 'quarantine' : 'inbox');
    }
  });
});

describe('RF-06 · sensibilidad configurable', () => {
  const borderline = emails.find((e) => e.id === 'sim-025')!;

  it('la sensibilidad alta clasifica más correos como riesgosos que la baja', () => {
    const withHigh = analyzeBatch(emails, { thresholds: SENSITIVITY_PRESETS.high });
    const withLow = analyzeBatch(emails, { thresholds: SENSITIVITY_PRESETS.low });
    const risky = (rs: typeof withHigh) => rs.filter((r) => r.level !== 'safe').length;
    expect(risky(withHigh)).toBeGreaterThan(risky(withLow));
  });

  it('el puntaje no depende del umbral, solo la etiqueta', () => {
    const a = analyzeEmail(borderline, { thresholds: SENSITIVITY_PRESETS.high });
    const b = analyzeEmail(borderline, { thresholds: SENSITIVITY_PRESETS.low });
    expect(a.score).toBe(b.score);
    expect(a.level).not.toBe(b.level);
  });
});

describe('rendimiento (RNF: 50 correos en menos de 60 s)', () => {
  it('analiza 50 correos muy por debajo del presupuesto', () => {
    const batch = [...emails, ...emails].slice(0, 50);
    const start = performance.now();
    analyzeBatch(batch);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
