import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ConfiguracionService,
  type UmbralesEntrada,
} from './configuracion.service.js';
import { SENSIBILIDADES } from '../analysis/umbrales.js';
import { AdminGuard } from '../dashboard/admin.guard.js';

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

  @Get('umbrales')
  @UseGuards(AdminGuard)
  async obtenerUmbrales() {
    const { umbrales } = await this.configuracion.obtenerAjustesAnalisis();
    return umbrales;
  }

  @Put('umbrales')
  @UseGuards(AdminGuard)
  guardarUmbrales(@Body() body?: UmbralesEntrada) {
    return this.configuracion.guardarUmbrales(body);
  }
}
