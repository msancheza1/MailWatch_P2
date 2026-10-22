import { vi } from 'vitest';
import { construirAlerta, type NivelRiesgo } from './alerta.js';
import { AnalysisService } from './analysis.service.js';
import { DatabaseService } from '../database/database.service.js';
import { QuarantineService } from '../quarantine/quarantine.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';

describe('US-09 alerta de correo peligroso', () => {
  describe('construirAlerta', () => {
    it('alerta solo cuando el riesgo es alto', () => {
      expect(construirAlerta('HIGH', true).alertar).toBe(true);
      expect(construirAlerta('MEDIUM', false).alertar).toBe(false);
      expect(construirAlerta('LOW', false).alertar).toBe(false);
    });

    it.each<[NivelRiesgo, string]>([
      ['HIGH', 'Riesgo alto'],
      ['MEDIUM', 'Riesgo medio'],
      ['LOW', 'Riesgo bajo'],
    ])('traduce %s a «%s» para el usuario', (nivel, etiqueta) => {
      expect(construirAlerta(nivel, false)).toMatchObject({ nivel, etiqueta });
    });

    it.each<NivelRiesgo>(['HIGH', 'MEDIUM', 'LOW'])(
      'indica una acción recomendada en riesgo %s',
      (nivel) => {
        // Criterio del issue: ningún nivel puede quedarse sin decirle al
        // usuario qué hacer, ni siquiera el seguro.
        expect(
          construirAlerta(nivel, false).accionRecomendada.length,
        ).toBeGreaterThan(20);
      },
    );

    it('dice al usuario que no abra enlaces ni adjuntos en riesgo alto', () => {
      const { accionRecomendada } = construirAlerta('HIGH', true);
      expect(accionRecomendada).toContain('No abras los enlaces');
      expect(accionRecomendada).toContain('adjuntos');
    });

    it('menciona la cuarentena solo cuando el correo fue aislado', () => {
      expect(construirAlerta('HIGH', true).accionRecomendada).toContain(
        'cuarentena',
      );
      expect(construirAlerta('HIGH', false).accionRecomendada).not.toContain(
        'cuarentena',
      );
    });
  });

  describe('CP-US09-01 — el análisis entrega la alerta', () => {
    const query = vi.fn();
    const recordAnalysis = vi.fn();
    const service = new AnalysisService(
      { query } as unknown as DatabaseService,
      { recordAnalysis } as unknown as QuarantineService,
      {
        obtenerSensibilidad: async () => 'estandar',
      } as unknown as ConfiguracionService,
    );

    beforeEach(() => vi.resetAllMocks());

    it('alerta ante un correo de riesgo alto', async () => {
      query.mockResolvedValue({
        rows: [
          {
            sender: 'security@fakebank.com',
            subject: 'Verify account',
            content: 'Click here to verify your account',
          },
        ],
      });
      recordAnalysis.mockResolvedValue('quarantined');

      const resultado = await service.analyzeEmail(1);

      expect(resultado.risk).toBe('HIGH');
      expect(resultado.alerta).toMatchObject({
        alertar: true,
        nivel: 'HIGH',
        etiqueta: 'Riesgo alto',
      });
      expect(resultado.alerta.accionRecomendada).toContain('cuarentena');
      // La alerta no reemplaza a la explicación: ambas viajan juntas (RF-04).
      expect(resultado.indicators.length).toBeGreaterThanOrEqual(3);
    });

    it('no alerta ante un correo seguro', async () => {
      query.mockResolvedValue({
        rows: [
          {
            sender: 'admin@gmail.com',
            subject: 'Meeting tomorrow',
            content: 'See attached document',
          },
        ],
      });
      recordAnalysis.mockResolvedValue('available');

      const resultado = await service.analyzeEmail(2);

      expect(resultado.risk).toBe('LOW');
      expect(resultado.alerta).toMatchObject({
        alertar: false,
        nivel: 'LOW',
        etiqueta: 'Riesgo bajo',
      });
      expect(resultado.alerta.accionRecomendada).not.toContain('cuarentena');
    });
  });
});
