import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { classes, rooms } from '../../../database/schema';

@Injectable()
export class RoomsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async getAllRooms(centerId: number) {
    const rows = await this.db
      .select({
        roomId: rooms.roomId,
        centerId: rooms.centerId,
        roomNumber: rooms.roomNumber,
        classId: rooms.classId,
        day: rooms.day,
        time: rooms.time,
        endTime: rooms.endTime,
        createdAt: rooms.createdAt,
        updatedAt: rooms.updatedAt,
        className: classes.className,
        teacherId: classes.teacherId,
        startDate: classes.startDate,
        endDate: classes.endDate,
      })
      .from(rooms)
      .leftJoin(classes, and(eq(classes.classId, rooms.classId), isNull(classes.deletedAt)))
      .where(eq(rooms.centerId, centerId))
      .orderBy(asc(rooms.roomNumber), asc(rooms.day), asc(rooms.time));
    return rows;
  }

  async getRoomById(id: number, centerId: number) {
    const rows = await this.db.select().from(rooms).where(and(eq(rooms.roomId, id), eq(rooms.centerId, centerId))).limit(1);
    if (!rows[0]) throw new NotFoundException('Room not found');
    return rows[0];
  }

  async createRoom(data: any) {
    const timeWindow = this.normalizeTimeWindow(data.time, data.end_time);
    const conflict = await this.findConflict(data.center_id, data.room_number, data.day, timeWindow.start, timeWindow.end);
    if (conflict) throw new ConflictException({ error: 'Room is not available for this time.', conflict });
    const rows = await this.db
      .insert(rooms)
      .values({
        centerId: data.center_id,
        roomNumber: data.room_number,
        classId: data.class_id || null,
        day: data.day,
        time: timeWindow.start,
        endTime: timeWindow.end,
      })
      .returning();
    return rows[0];
  }

  async updateRoom(id: number, data: any, centerId: number) {
    const timeWindow = this.normalizeTimeWindow(data.time, data.end_time);
    const conflict = await this.findConflict(centerId, data.room_number, data.day, timeWindow.start, timeWindow.end, id);
    if (conflict) throw new ConflictException({ error: 'Room is not available for this time.', conflict });
    const rows = await this.db
      .update(rooms)
      .set({
        roomNumber: data.room_number,
        classId: data.class_id || null,
        day: data.day,
        time: timeWindow.start,
        endTime: timeWindow.end,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(rooms.roomId, id), eq(rooms.centerId, centerId)))
      .returning();
    if (!rows[0]) throw new NotFoundException('Room not found');
    return rows[0];
  }

  async deleteRoom(id: number, centerId: number) {
    const rows = await this.db.delete(rooms).where(and(eq(rooms.roomId, id), eq(rooms.centerId, centerId))).returning();
    if (!rows[0]) throw new NotFoundException('Room not found');
    return { message: 'Room deleted successfully' };
  }

  private normalizeTimeWindow(time: string, endTime?: string) {
    const start = String(time || '').substring(0, 5);
    const end = String(endTime || this.addMinutesToTime(start, 60)).substring(0, 5);
    const startMinutes = this.minutesFromTime(start);
    const endMinutes = this.minutesFromTime(end);
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be after start time.');
    }
    return { start, end };
  }

  private addMinutesToTime(time: string, minutes: number) {
    const [hoursRaw, minutesRaw] = String(time || '').split(':');
    const hours = Number(hoursRaw);
    const mins = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return time;
    const total = hours * 60 + mins + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  private minutesFromTime(time: string) {
    const [hoursRaw, minutesRaw] = String(time || '').split(':');
    const hours = Number(hoursRaw);
    const mins = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
    return hours * 60 + mins;
  }

  private async findConflict(centerId: number, roomNumber: string, day: string, startTime: string, endTime: string, excludeRoomId?: number) {
    const conditions = [
      eq(rooms.centerId, centerId),
      sql`lower(trim(${rooms.roomNumber})) = lower(${roomNumber.trim()})`,
      eq(rooms.day, day),
      sql`${rooms.time} < ${endTime}::time`,
      sql`COALESCE(${rooms.endTime}, ${rooms.time} + INTERVAL '1 hour') > ${startTime}::time`,
    ];
    if (excludeRoomId) conditions.push(ne(rooms.roomId, excludeRoomId));
    const rows = await this.db
      .select({
        roomId: rooms.roomId,
        roomNumber: rooms.roomNumber,
        classId: rooms.classId,
        day: rooms.day,
        time: rooms.time,
        endTime: rooms.endTime,
      })
      .from(rooms)
      .where(and(...conditions))
      .limit(1);
    return rows[0] || null;
  }
}
