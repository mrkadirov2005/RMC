import type { AttendanceRecord } from './attendance.entity';

export const ATTENDANCE_REPOSITORY = Symbol('ATTENDANCE_REPOSITORY');

export interface AttendanceRepositoryPort {
  findAll(centerId?: number): Promise<AttendanceRecord[]>;
  findById(id: number, centerId?: number): Promise<AttendanceRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<AttendanceRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<AttendanceRecord | null>;
  delete(id: number, centerId?: number): Promise<AttendanceRecord | null>;
}
