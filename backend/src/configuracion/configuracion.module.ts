import { Module } from '@nestjs/common';
import { ConfiguracionController } from './configuracion.controller.js';
import { ConfiguracionService } from './configuracion.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AdminGuard } from '../dashboard/admin.guard.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService, AdminGuard],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
