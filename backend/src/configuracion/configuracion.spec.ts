import { vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service.js';
import { DatabaseService } from '../database/database.service.js';
import { QuarantineService } from '../quarantine/quarantine.service.js';
import { AnalysisService } from '../analysis/analysis.service.js';
import { nivelPara, esSensibilidad } from '../analysis/umbrales.js';

describe('US-06 configuración del nivel de sensibilidad', () => {
  describe('umbrales', () => {
    it.each([
      [0, 'LOW'],
      [1, 'MEDIUM'],
      [2, 'MEDIUM'],
      [3, 'HIGH'],
      [9, 'HIGH'],
    ])('estándar: %i indicadores son %s', (indicadores, nivel) => {
      expect(nivelPara(indicadores as number, 'estandar')).toBe(nivel);
    });

    it.each([
      [0, 'LOW'],
      [1, 'MEDIUM'],
      [2, 'HIGH'],
      [3, 'HIGH'],
    ])('estricto: %i indicadores son %s', (indicadores, nivel) => {
      expect(nivelPara(indicadores as number, 'estricto')).toBe(nivel);
    });

    it('estricto nunca es más indulgente que estándar', () => {
      const orden = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      for (let i = 0; i <= 10; i++) {
        expect(orden[nivelPara(i, 'estricto')]).toBeGreaterThanOrEqual(
          orden[nivelPara(i, 'estandar')],
        );
      }
    });

    it('rechaza valores que no son una sensibilidad', () => {
      expect(esSensibilidad('estandar')).toBe(true);
      expect(esSensibilidad('estricto')).toBe(true);
      expect(esSensibilidad('paranoico')).toBe(false);
      expect(esSensibilidad(undefined)).toBe(false);
    });
  });

  describe('guardar y leer la configuración', () => {
    const query = vi.fn();
    const servicio = new ConfiguracionService({
      query,
    } as unknown as DatabaseService);

    beforeEach(() => vi.resetAllMocks());

    it('guarda el cambio de configuración', async () => {
      query.mockResolvedValue({ rows: [] });

      expect(await servicio.guardarSensibilidad('estricto')).toBe('estricto');
      expect(query).toHaveBeenCalledWith(expect.any(String), ['estricto']);
    });

    it('lee la sensibilidad guardada', async () => {
      query.mockResolvedValue({ rows: [{ sensibilidad: 'estricto' }] });

      expect(await servicio.obtenerSensibilidad()).toBe('estricto');
    });

    it('no acepta una sensibilidad inventada', async () => {
      await expect(
        servicio.guardarSensibilidad('paranoico'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(query).not.toHaveBeenCalled();
    });

    it.each([[[]], [[{ sensibilidad: 'ninguna' }]]])(
      'cae en estándar si lo guardado no sirve (%j)',
      async (rows) => {
        query.mockResolvedValue({ rows });

        // Que no se pueda leer la preferencia no es razón para dejar de
        // analizar correos.
        expect(await servicio.obtenerSensibilidad()).toBe('estandar');
      },
    );
  });

  describe('CP-US06-01 — el análisis usa la nueva configuración', () => {
    const query = vi.fn();
    const recordAnalysis = vi.fn();
    const obtenerSensibilidad = vi.fn();

    const service = new AnalysisService(
      { query } as unknown as DatabaseService,
      { recordAnalysis } as unknown as QuarantineService,
      { obtenerSensibilidad } as unknown as ConfiguracionService,
    );

    // Correo de zona gris: exactamente dos indicadores («account» y «login»).
    // Es el único punto donde las dos sensibilidades discrepan, así que es el
    // que prueba que el cambio de configuración sirve para algo.
    const zonaGris = {
      rows: [
        {
          sender: 'newsletter@shop-online.com',
          subject: 'Your account summary',
          content: 'Please login to view your monthly statement.',
        },
      ],
    };

    beforeEach(() => vi.resetAllMocks());

    it('en estándar lo deja en sospechoso y disponible', async () => {
      query.mockResolvedValue(zonaGris);
      obtenerSensibilidad.mockResolvedValue('estandar');
      recordAnalysis.mockResolvedValue('available');

      const resultado = await service.analyzeEmail(1);

      expect(resultado.indicators).toHaveLength(2);
      expect(resultado).toMatchObject({
        risk: 'MEDIUM',
        category: 'Suspicious',
        sensibilidad: 'estandar',
      });
      expect(resultado.alerta.alertar).toBe(false);
    });

    it('en estricto el mismo correo pasa a malicioso y alerta', async () => {
      query.mockResolvedValue(zonaGris);
      obtenerSensibilidad.mockResolvedValue('estricto');
      recordAnalysis.mockResolvedValue('quarantined');

      const resultado = await service.analyzeEmail(1);

      expect(resultado.indicators).toHaveLength(2);
      expect(resultado).toMatchObject({
        risk: 'HIGH',
        category: 'Malicious',
        sensibilidad: 'estricto',
      });
      // US-09 se apoya en US-06: subir la sensibilidad adelanta la alerta.
      expect(resultado.alerta.alertar).toBe(true);
      expect(recordAnalysis).toHaveBeenCalledWith(1, 'HIGH', expect.any(Array));
    });
  });
});
