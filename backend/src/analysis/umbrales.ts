import type { NivelRiesgo } from './alerta.js';

export type Sensibilidad = 'estandar' | 'estricto';
export type Umbrales = Record<
  Sensibilidad,
  { readonly medio: number; readonly alto: number }
>;

export const SENSIBILIDADES: Sensibilidad[] = ['estandar', 'estricto'];

export const SENSIBILIDAD_POR_DEFECTO: Sensibilidad = 'estandar';

// Valores iniciales de los modos de sensibilidad.
export const UMBRALES_POR_DEFECTO: Umbrales = {
  estandar: { alto: 3, medio: 1 },
  estricto: { alto: 2, medio: 1 },
};

export function esSensibilidad(valor: unknown): valor is Sensibilidad {
  return SENSIBILIDADES.includes(valor as Sensibilidad);
}

export function nivelPara(
  indicadores: number,
  sensibilidad: Sensibilidad,
  umbrales: Umbrales = UMBRALES_POR_DEFECTO,
): NivelRiesgo {
  const umbral = umbrales[sensibilidad] ?? umbrales[SENSIBILIDAD_POR_DEFECTO];

  if (indicadores >= umbral.alto) {
    return 'HIGH';
  }

  if (indicadores >= umbral.medio) {
    return 'MEDIUM';
  }

  return 'LOW';
}
