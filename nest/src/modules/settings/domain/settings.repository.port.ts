import type { SettingsRecord } from './settings.entity';

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');

export interface SettingsRepositoryPort {
  findAll(centerId?: number): Promise<SettingsRecord[]>;
  findById(id: number, centerId?: number): Promise<SettingsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<SettingsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<SettingsRecord | null>;
  delete(id: number, centerId?: number): Promise<SettingsRecord | null>;
}
