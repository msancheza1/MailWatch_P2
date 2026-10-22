/**
 * Alerta de correo peligroso (US-09, issue #11).
 *
 * El issue pide tres cosas: generar la alerta, mostrar el nivel de riesgo e
 * indicar la acción recomendada. Esto resuelve las tres como una función pura
 * sobre el nivel que ya calcula `AnalysisService`, por dos razones:
 *
 * 1. Se prueba sin base de datos ni servidor (ver `alerta.spec.ts`).
 * 2. El texto de la alerta es la misma decisión de producto para cualquier
 *    cliente —la interfaz de hoy, el panel de administrador o la extensión de
 *    Chrome—, así que no pertenece a un componente de React.
 *
 * Solo el riesgo alto alerta. Avisar también en riesgo medio entrenaría al
 * usuario a ignorar el aviso, que es justo lo que no queremos cuando aparezca
 * uno de verdad.
 */

export type NivelRiesgo = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AlertaRiesgo {
  /** Solo el riesgo alto interrumpe al usuario. */
  alertar: boolean;
  /** Criterio «mostrar nivel de riesgo». */
  nivel: NivelRiesgo;
  /** El nivel en palabras, porque LOW/MEDIUM/HIGH no se le enseña al usuario. */
  etiqueta: string;
  /** Criterio «indicar acción recomendada». */
  accionRecomendada: string;
}

const NIVELES: Record<NivelRiesgo, { etiqueta: string; accion: string }> = {
  HIGH: {
    etiqueta: 'Riesgo alto',
    accion:
      'No abras los enlaces ni respondas, y no descargues los adjuntos. ' +
      'Si esperabas este correo, confirma con el remitente por otro medio ' +
      'antes de hacerle caso.',
  },
  MEDIUM: {
    etiqueta: 'Riesgo medio',
    accion:
      'Revisa el remitente y a dónde llevan los enlaces antes de interactuar. ' +
      'Si no esperabas este correo, no abras los adjuntos.',
  },
  LOW: {
    etiqueta: 'Riesgo bajo',
    accion:
      'No se encontraron indicadores de phishing. Aun así, desconfía si el ' +
      'correo te pide contraseñas o datos de pago.',
  },
};

/**
 * `enCuarentena` viene del estado que devuelve `QuarantineService`. Se pasa
 * como parámetro en lugar de deducirlo del nivel para que la acción
 * recomendada no mienta si mañana cambia la regla de aislamiento (US-05).
 */
export function construirAlerta(
  nivel: NivelRiesgo,
  enCuarentena: boolean,
): AlertaRiesgo {
  const { etiqueta, accion } = NIVELES[nivel];

  return {
    alertar: nivel === 'HIGH',
    nivel,
    etiqueta,
    accionRecomendada: enCuarentena
      ? accion + ' El correo ya está aislado en cuarentena.'
      : accion,
  };
}
