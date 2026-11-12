import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  esSensibilidad,
  SENSIBILIDADES,
  SENSIBILIDAD_POR_DEFECTO,
  UMBRALES_POR_DEFECTO,
  type Sensibilidad,
  type Umbrales,
} from '../analysis/umbrales.js';

export type UmbralesEntrada = Partial<
  Record<Sensibilidad, { medio?: unknown; alto?: unknown } | null>
>;

function esUmbral(valor: unknown): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor >= 1 &&
    valor <= 2_147_483_647
  );
}

@Injectable()
export class ConfiguracionService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Si la fila no existe o trae un valor que no reconocemos, se devuelve la
   * sensibilidad por defecto en lugar de fallar: que no se pueda leer una
   * preferencia no es razón para dejar de analizar correos.
   */
  async obtenerSensibilidad(): Promise<Sensibilidad> {
    const resultado = await this.database.query(
      'SELECT sensibilidad FROM configuracion WHERE id = 1',
    );

    const guardada = resultado.rows[0]?.sensibilidad;

    return esSensibilidad(guardada) ? guardada : SENSIBILIDAD_POR_DEFECTO;
  }

  async guardarSensibilidad(sensibilidad: unknown): Promise<Sensibilidad> {
    if (!esSensibilidad(sensibilidad)) {
      throw new BadRequestException(
        `Sensibilidad no válida. Valores admitidos: ${SENSIBILIDADES.join(', ')}.`,
      );
    }

    // La fila 1 se crea en la migración, pero el UPSERT evita depender de ello.
    await this.database.query(
      `INSERT INTO configuracion (id, sensibilidad, actualizada_en)
       VALUES (1, $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET sensibilidad = EXCLUDED.sensibilidad,
           actualizada_en = EXCLUDED.actualizada_en`,
      [sensibilidad],
    );

    return sensibilidad;
  }

  async obtenerAjustesAnalisis(): Promise<{
    sensibilidad: Sensibilidad;
    umbrales: Umbrales;
  }> {
    // Lee también el esquema anterior mientras se aplica la migración 005.
    const { rows } = await this.database.query(
      'SELECT * FROM configuracion WHERE id = 1',
    );
    const fila = rows[0];

    return {
      sensibilidad: esSensibilidad(fila?.sensibilidad)
        ? fila.sensibilidad
        : SENSIBILIDAD_POR_DEFECTO,
      umbrales:
        fila?.medio_estandar != null
          ? {
              estandar: {
                medio: fila.medio_estandar,
                alto: fila.alto_estandar,
              },
              estricto: {
                medio: fila.medio_estricto,
                alto: fila.alto_estricto,
              },
            }
          : UMBRALES_POR_DEFECTO,
    };
  }

  async guardarUmbrales(body?: UmbralesEntrada): Promise<Umbrales> {
    const medioEstandar = body?.estandar?.medio;
    const altoEstandar = body?.estandar?.alto;
    const medioEstricto = body?.estricto?.medio;
    const altoEstricto = body?.estricto?.alto;

    if (
      !esUmbral(medioEstandar) ||
      !esUmbral(altoEstandar) ||
      !esUmbral(medioEstricto) ||
      !esUmbral(altoEstricto)
    ) {
      throw new BadRequestException(
        'Ingresa números enteros positivos para los cuatro umbrales.',
      );
    }

    if (medioEstandar >= altoEstandar || medioEstricto >= altoEstricto) {
      throw new BadRequestException(
        'En cada modo, el umbral medio debe ser menor que el alto.',
      );
    }

    if (medioEstricto > medioEstandar || altoEstricto > altoEstandar) {
      throw new BadRequestException(
        'Los umbrales del modo estricto deben ser iguales o menores que los del estándar.',
      );
    }

    try {
      await this.database.query(
        `INSERT INTO configuracion
         (id, medio_estandar, alto_estandar, medio_estricto, alto_estricto)
       VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET medio_estandar = EXCLUDED.medio_estandar,
           alto_estandar = EXCLUDED.alto_estandar,
           medio_estricto = EXCLUDED.medio_estricto,
           alto_estricto = EXCLUDED.alto_estricto,
           actualizada_en = CURRENT_TIMESTAMP`,
        [medioEstandar, altoEstandar, medioEstricto, altoEstricto],
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '42703'
      ) {
        throw new ServiceUnavailableException(
          'Aplica la migración de umbrales para poder guardar los cambios.',
        );
      }
      throw error;
    }

    return {
      estandar: { medio: medioEstandar, alto: altoEstandar },
      estricto: { medio: medioEstricto, alto: altoEstricto },
    };
  }
}
