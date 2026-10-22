/**
 * Umbrales de clasificación por nivel de sensibilidad (US-06, issue #8).
 *
 * El issue pide dos opciones, estándar y estricto, y que «el análisis use la
 * nueva configuración». Esto es esa traducción: de cuántos indicadores encontró
 * el motor al nivel de riesgo, según lo que el usuario eligió.
 *
 * `estandar` reproduce exactamente el comportamiento que tenía el análisis antes
 * de existir esta historia (alto con 3 indicadores, medio con 1). Eso es
 * deliberado: cambiar la sensibilidad por defecto habría movido la clasificación
 * de todos los correos y roto las pruebas de US-03 y US-05 sin que nadie lo
 * pidiera.
 *
 * `estricto` baja el umbral de «alto» a 2. El usuario cambia falsos negativos
 * por falsos positivos a conciencia: marca más correos como peligrosos, avisa
 * antes y manda más cosas a cuarentena.
 */

import type { NivelRiesgo } from './alerta.js';

export type Sensibilidad = 'estandar' | 'estricto';

export const SENSIBILIDADES: Sensibilidad[] = ['estandar', 'estricto'];

export const SENSIBILIDAD_POR_DEFECTO: Sensibilidad = 'estandar';

const UMBRALES: Record<Sensibilidad, { alto: number; medio: number }> = {
  estandar: { alto: 3, medio: 1 },
  estricto: { alto: 2, medio: 1 },
};

export function esSensibilidad(valor: unknown): valor is Sensibilidad {
  return SENSIBILIDADES.includes(valor as Sensibilidad);
}

export function nivelPara(
  indicadores: number,
  sensibilidad: Sensibilidad,
): NivelRiesgo {
  const umbral = UMBRALES[sensibilidad] ?? UMBRALES[SENSIBILIDAD_POR_DEFECTO];

  if (indicadores >= umbral.alto) {
    return 'HIGH';
  }

  if (indicadores >= umbral.medio) {
    return 'MEDIUM';
  }

  return 'LOW';
}
