const pool = require('../../../db/pool');
const { db } = pool;
const { and, asc, eq, ne, sql } = require('drizzle-orm');
const { classes, rooms } = require('../../../db/schema');

const roomColumns = {
  roomId: rooms.roomId,
  centerId: rooms.centerId,
  roomNumber: rooms.roomNumber,
  physicalRoomId: rooms.physicalRoomId,
  classId: rooms.classId,
  day: rooms.day,
  time: rooms.time,
  endTime: rooms.endTime,
  createdAt: rooms.createdAt,
  updatedAt: rooms.updatedAt,
};

const findAll = (centerId: number) => {
  return db
    .select({
      ...roomColumns,
      className: classes.className,
      teacherId: classes.teacherId,
      startDate: classes.startDate,
      endDate: classes.endDate,
    })
    .from(rooms)
    .leftJoin(classes, and(eq(rooms.classId, classes.classId), sql`${classes.deletedAt} IS NULL`))
    .where(eq(rooms.centerId, centerId))
    .orderBy(asc(rooms.roomNumber), asc(rooms.day), asc(rooms.time));
};

const findById = (id: number, centerId: number) => {
  return db
    .select()
    .from(rooms)
    .where(and(eq(rooms.roomId, id), eq(rooms.centerId, centerId)))
    .then((rows: any[]) => rows[0] || null);
};

const ensurePhysicalRoom = async (centerId: number, roomNumber: string) => {
  const result = await pool.query(`
    INSERT INTO physical_rooms (center_id, name) VALUES ($1, trim($2))
    ON CONFLICT (center_id, lower(trim(name))) DO UPDATE SET updated_at = physical_rooms.updated_at
    RETURNING physical_room_id
  `, [centerId, roomNumber]);
  return result.rows[0].physical_room_id;
};

const insert = async (params: any[]) => {
  const physicalRoomId = await ensurePhysicalRoom(params[0], params[1]);
  return db
    .insert(rooms)
    .values({
      centerId: params[0],
      roomNumber: params[1],
      physicalRoomId,
      classId: params[2],
      day: params[3],
      time: params[4],
      endTime: params[5],
    })
    .returning()
    .then((rows: any[]) => rows[0]);
};

const update = async (id: number, params: any[], centerId: number) => {
  const physicalRoomId = await ensurePhysicalRoom(centerId, params[0]);
  return db
    .update(rooms)
    .set({
      roomNumber: params[0],
      physicalRoomId,
      classId: params[1],
      day: params[2],
      time: params[3],
      endTime: params[4],
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(rooms.roomId, id), eq(rooms.centerId, centerId)))
    .returning()
    .then((rows: any[]) => rows[0] || null);
};

const remove = (id: number, centerId: number) => {
  return db
    .delete(rooms)
    .where(and(eq(rooms.roomId, id), eq(rooms.centerId, centerId)))
    .returning()
    .then((rows: any[]) => rows[0] || null);
};

const findByClassId = (classId: number, centerId: number) => {
  return db
    .select(roomColumns)
    .from(rooms)
    .innerJoin(classes, and(eq(classes.classId, rooms.classId), sql`${classes.deletedAt} IS NULL`))
    .where(and(eq(rooms.classId, classId), eq(rooms.centerId, centerId)))
    .orderBy(asc(rooms.day), asc(rooms.time));
};

const findConflict = (centerId: number, roomNumber: string, day: string, startTime: string, endTime: string, excludeRoomId?: number) => {
  const filters = [
    eq(rooms.centerId, centerId),
    sql`lower(trim(${rooms.roomNumber})) = lower(${roomNumber.trim()})`,
    eq(rooms.day, day),
    sql`${rooms.time} < ${endTime}::time`,
    sql`COALESCE(${rooms.endTime}, ${rooms.time} + INTERVAL '1 hour') > ${startTime}::time`,
  ];
  if (excludeRoomId) {
    filters.push(ne(rooms.roomId, excludeRoomId));
  }
  return db
    .select({
      roomId: rooms.roomId,
      roomNumber: rooms.roomNumber,
      classId: rooms.classId,
      day: rooms.day,
      time: rooms.time,
      endTime: rooms.endTime,
    })
    .from(rooms)
    .where(and(...filters))
    .limit(1)
    .then((rows: any[]) => rows[0] || null);
};

module.exports = { findAll, findById, insert, update, remove, findByClassId, findConflict };


export {};
