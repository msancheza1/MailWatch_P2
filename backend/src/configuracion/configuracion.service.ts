import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  esSensibilidad,
  SENSIBILIDADES,
  SENSIBILIDAD_POR_DEFECTO,
  type Sensibilidad,
} from '../analysis/umbrales.js';

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
}
