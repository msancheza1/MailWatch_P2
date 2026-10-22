import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service.js';
import { SENSIBILIDADES } from '../analysis/umbrales.js';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get()
  async obtener() {
    return {
      sensibilidad: await this.configuracion.obtenerSensibilidad(),
      opciones: SENSIBILIDADES,
    };
  }

  @Put()
  async guardar(@Body() body: { sensibilidad?: unknown }) {
    const sensibilidad = await this.configuracion.guardarSensibilidad(
      body?.sensibilidad,
    );

    return { sensibilidad, guardada: true };
  }
}
