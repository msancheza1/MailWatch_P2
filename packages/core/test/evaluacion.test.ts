import { describe, expect, it } from 'vitest';
import { loadSimulatedEmails } from '@mailwatch/fixtures';
import { analyzeBatch } from '../src/engine.js';
import { evaluate } from '../src/evaluate.js';
import { folderFor } from '../src/quarantine.js';
import { SENSITIVITY_PRESETS, type SensitivityPreset } from '../src/types.js';

const emails = loadSimulatedEmails();
const PRESETS = ['low', 'balanced', 'high'] as const;

function resultsFor(preset: SensitivityPreset) {
  return analyzeBatch(emails, { thresholds: SENSITIVITY_PRESETS[preset] });
}

describe('calidad del detector · sensibilidad media', () => {
  const results = resultsFor('balanced');

  it('no deja pasar ninguna amenaza', () => {
    const { metrics, mistakes } = evaluate(emails, results, 'amenaza');
    expect(mistakes.filter((m) => m.kind === 'falso negativo')).toEqual([]);
    expect(metrics.recall).toBe(1);
  });

  it('no genera falsas alarmas', () => {
    const { metrics } = evaluate(emails, results, 'amenaza');
    expect(metrics.falseAlarmRate).toBe(0);
  });

  it('todo lo que manda a cuarentena es realmente malicioso', () => {
    const { metrics } = evaluate(emails, results, 'malicioso');
    expect(metrics.precision).toBe(1);
  });
});

/**
 * La regla que no se puede romper en ninguna configuración: esconderle al
 * usuario un correo legítimo es el peor error posible del producto, mucho más
 * grave que dejar pasar uno sospechoso.
 */
describe('garantía transversal', () => {
  for (const preset of PRESETS) {
    it(`sensibilidad ${preset}: ningún correo legítimo termina en cuarentena`, () => {
      const results = resultsFor(preset);
      const byId = new Map(emails.map((email) => [email.id, email]));

      const quarantinedLegit = results
        .filter((result) => folderFor(result.level) === 'quarantine')
        .filter((result) => byId.get(result.emailId)?.groundTruth === 'safe')
        .map((result) => `${result.emailId} (${result.score})`);

      expect(quarantinedLegit).toEqual([]);
    });
  }
});

describe('la sensibilidad hace lo que promete', () => {
  it('subirla nunca reduce las amenazas detectadas', () => {
    const recalls = PRESETS.map(
      (preset) => evaluate(emails, resultsFor(preset), 'amenaza').metrics.recall,
    );
    expect(recalls[0]!).toBeLessThanOrEqual(recalls[1]!);
    expect(recalls[1]!).toBeLessThanOrEqual(recalls[2]!);
  });

  it('bajarla nunca aumenta las falsas alarmas', () => {
    const rates = PRESETS.map(
      (preset) => evaluate(emails, resultsFor(preset), 'amenaza').metrics.falseAlarmRate,
    );
    expect(rates[0]!).toBeLessThanOrEqual(rates[1]!);
    expect(rates[1]!).toBeLessThanOrEqual(rates[2]!);
  });
});

describe('casos que en su momento estuvieron mal clasificados', () => {
  const results = new Map(resultsFor('balanced').map((r) => [r.emailId, r]));
  const score = (id: string) => results.get(id)!;

  it('un correo con el código de un solo uso no es una petición de credenciales', () => {
    // Los correos de OTP legítimos dicen "código de verificación" todo el tiempo.
    expect(score('sim-034').level).toBe('safe');
  });

  it('escribir desde una cuenta personal no es suplantar una marca', () => {
    // `gmail.com` contiene el alias "gmail": antes sumaba 22 puntos a cualquiera.
    const signals = score('sim-041').signals.map((s) => s.id);
    expect(signals).not.toContain('domain.brand-combosquatting');
  });

  it('un adjunto .html se detecta como página de phishing', () => {
    const signals = score('sim-042').signals.map((s) => s.id);
    expect(signals).toContain('attachments.web-page');
  });

  it('un enlace con dirección deformada no se ignora en silencio', () => {
    const deformado = {
      ...emails[0]!,
      id: 'test-malformed',
      links: [{ text: 'Verificar', href: 'http://%%%no-es-una-url' }],
    };
    const signals = analyzeBatch([deformado])[0]!.signals.map((s) => s.id);
    expect(signals).toContain('links.malformed');
  });
});

describe('listas de dominios del usuario (RF-11)', () => {
  const phishing = emails.find((e) => e.id === 'sim-002')!;
  const legitimo = emails.find((e) => e.id === 'sim-001')!;

  it('un dominio de confianza deja el correo en seguro aunque el puntaje sea máximo', () => {
    const result = analyzeBatch([phishing], {
      policy: { trusted: ['bancolombia-verificacion.top'], blocked: [] },
    })[0]!;
    expect(result.score).toBeGreaterThan(90);
    expect(result.level).toBe('safe');
    expect(result.signals[0]!.id).toBe('policy.trusted-domain');
  });

  it('un dominio bloqueado manda a cuarentena aunque el correo sea legítimo', () => {
    const result = analyzeBatch([legitimo], {
      policy: { trusted: [], blocked: ['bancolombia.com.co'] },
    })[0]!;
    expect(result.score).toBe(0);
    expect(folderFor(result.level)).toBe('quarantine');
  });

  it('sin listas, nada cambia', () => {
    const conListasVacias = analyzeBatch([phishing], { policy: { trusted: [], blocked: [] } })[0]!;
    const sinPolítica = analyzeBatch([phishing])[0]!;
    expect(conListasVacias.level).toBe(sinPolítica.level);
    expect(conListasVacias.score).toBe(sinPolítica.score);
  });
});
