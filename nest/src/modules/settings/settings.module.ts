import { Module } from '@nestjs/common';
import { SettingsService } from './application/settings.service';
import { SETTINGS_REPOSITORY } from './domain/settings.repository.port';
import { PostgresSettingsRepository } from './infrastructure/postgres-settings.repository';
import { SettingsController } from './interfaces/settings.controller';

@Module({
  controllers: [SettingsController],
  providers: [
    SettingsService,
    { provide: SETTINGS_REPOSITORY, useClass: PostgresSettingsRepository },
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
