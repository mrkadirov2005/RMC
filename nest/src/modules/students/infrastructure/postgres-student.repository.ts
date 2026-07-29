import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { classes, students } from '../../../database/schema';
import type { Student } from '../domain/student.entity';
import type { StudentRepositoryPort } from '../domain/student.repository.port';

@Injectable()
export class PostgresStudentRepository implements StudentRepositoryPort {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAllWithClass(centerId?: number, teacherId?: number): Promise<Student[]> {
    return this.findStudents({ deleted: false, centerId, teacherId, order: 'student_desc' });
  }

  async findByIdWithClass(id: number, centerId?: number, teacherId?: number): Promise<Student | null> {
    const rows = await this.findStudents({ id, deleted: false, centerId, teacherId, limit: 1 });
    return rows[0] || null;
  }

  async findDeletedWithClassAndTeacher(centerId?: number): Promise<Student[]> {
    return this.findStudents({ deleted: true, centerId, order: 'deleted_desc' });
  }

  async findByClassIncludingTransferred(classId: number, centerId?: number, teacherId?: number): Promise<Student[]> {
    const conditions: any[] = [or(eq(students.classId, classId), eq(students.previousClassId, classId))];
    if (centerId) conditions.push(eq(students.centerId, centerId));
    if (teacherId) conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`);
    return this.db
      .select(this.studentWithClassSelection(false))
      .from(students)
      .leftJoin(classes, eq(classes.classId, students.classId))
      .where(and(...conditions))
      .orderBy(asc(students.firstName), asc(students.lastName));
  }

  async insert(payload: any): Promise<Student> {
    const rows = await this.db
      .insert(students)
      .values({
        centerId: payload.center_id,
        enrollmentNumber: payload.enrollment_number,
        firstName: payload.first_name,
        lastName: payload.last_name,
        username: payload.username,
        passwordHash: payload.password_hash,
        email: payload.email,
        phone: payload.phone,
        dateOfBirth: payload.date_of_birth,
        parentName: payload.parent_name,
        parentPhone: payload.parent_phone,
        gender: payload.gender,
        status: payload.status || 'Active',
        teacherId: payload.teacher_id,
        classId: payload.class_id,
        schoolName: payload.school_name,
        schoolClass: payload.school_class,
        isFrozen: payload.is_frozen ?? false,
      })
      .returning(this.studentSelection());
    return rows[0];
  }

  async update(id: number, payload: any, centerId?: number, teacherId?: number): Promise<Student | null> {
    const existing = await this.findByIdWithClass(id, centerId, teacherId);
    if (!existing) return null;
    const rows = await this.db
      .update(students)
      .set({
        firstName: sql`COALESCE(${payload.first_name ?? null}, ${students.firstName})`,
        lastName: sql`COALESCE(${payload.last_name ?? null}, ${students.lastName})`,
        username: sql`COALESCE(${payload.username ?? null}, ${students.username})`,
        passwordHash: sql`COALESCE(${payload.password_hash ?? null}, ${students.passwordHash})`,
        email: sql`COALESCE(${payload.email ?? null}, ${students.email})`,
        phone: sql`COALESCE(${payload.phone ?? null}, ${students.phone})`,
        dateOfBirth: sql`COALESCE(${payload.date_of_birth ?? null}, ${students.dateOfBirth})`,
        parentName: sql`COALESCE(${payload.parent_name ?? null}, ${students.parentName})`,
        parentPhone: sql`COALESCE(${payload.parent_phone ?? null}, ${students.parentPhone})`,
        gender: sql`COALESCE(${payload.gender ?? null}, ${students.gender})`,
        status: sql`COALESCE(${payload.status ?? null}, ${students.status})`,
        teacherId: sql`COALESCE(${payload.teacher_id ?? null}, ${students.teacherId})`,
        classId: sql`COALESCE(${payload.class_id ?? null}, ${students.classId})`,
        schoolName: sql`COALESCE(${payload.school_name ?? null}, ${students.schoolName})`,
        schoolClass: sql`COALESCE(${payload.school_class ?? null}, ${students.schoolClass})`,
        isFrozen: sql`COALESCE(${payload.is_frozen ?? null}, ${students.isFrozen})`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(students.studentId, id), isNull(students.deletedAt)))
      .returning(this.studentSelection());
    return rows[0] || null;
  }

  async softDelete(id: number, centerId?: number, teacherId?: number): Promise<Student | null> {
    return this.deleteMutation(id, false, centerId, teacherId);
  }

  async purge(id: number, centerId?: number, teacherId?: number): Promise<Student | null> {
    return this.deleteMutation(id, true, centerId, teacherId);
  }

  async transferToClass(id: number, targetClassId: number, centerId?: number, teacherId?: number): Promise<any> {
    const student = await this.findByIdWithClass(id, centerId, teacherId);
    if (!student) return { error: 'not_found' };
    if (Number(student.class_id || 0) === targetClassId) return { error: 'same_class' };
    const rows = await this.db
      .update(students)
      .set({ previousClassId: sql`${students.classId}`, classId: targetClassId, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(students.studentId, id))
      .returning(this.studentSelection());
    return { student: rows[0], transferred: student };
  }

  async findByUsername(username: string): Promise<Student | null> {
    const rows = await this.db.select(this.studentSelection()).from(students).where(and(eq(students.username, username), isNull(students.deletedAt))).limit(1);
    return rows[0] || null;
  }

  private async deleteMutation(id: number, hard: boolean, centerId?: number, teacherId?: number): Promise<Student | null> {
    const rows = await this.findStudents({ id, deleted: hard, centerId, teacherId, limit: 1 });
    if (!rows[0]) return null;
    if (hard) {
      const deleted = await this.db.delete(students).where(and(eq(students.studentId, id), isNotNull(students.deletedAt))).returning(this.studentSelection());
      return deleted[0] || null;
    }
    const deleted = await this.db
      .update(students)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(students.studentId, id), isNull(students.deletedAt)))
      .returning(this.studentSelection());
    return deleted[0] || null;
  }

  private findStudents(options: { id?: number; deleted: boolean; centerId?: number; teacherId?: number; order?: 'student_desc' | 'deleted_desc'; limit?: number }) {
    const conditions: any[] = [options.deleted ? isNotNull(students.deletedAt) : isNull(students.deletedAt)];
    if (options.id) conditions.push(eq(students.studentId, options.id));
    if (options.centerId) conditions.push(eq(students.centerId, options.centerId));
    if (options.teacherId) conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${options.teacherId}`);
    let builder = this.db
      .select(this.studentWithClassSelection(true))
      .from(students)
      .leftJoin(classes, eq(classes.classId, students.classId))
      .where(and(...conditions));
    if (options.order === 'deleted_desc') builder = builder.orderBy(desc(students.deletedAt));
    else builder = builder.orderBy(desc(students.studentId));
    if (options.limit) builder = builder.limit(options.limit);
    return builder;
  }

  private studentSelection() {
    return {
      student_id: students.studentId,
      id: students.studentId,
      center_id: students.centerId,
      enrollment_number: students.enrollmentNumber,
      first_name: students.firstName,
      last_name: students.lastName,
      username: students.username,
      password_hash: students.passwordHash,
      email: students.email,
      phone: students.phone,
      date_of_birth: students.dateOfBirth,
      parent_name: students.parentName,
      parent_phone: students.parentPhone,
      gender: students.gender,
      status: students.status,
      teacher_id: students.teacherId,
      class_id: students.classId,
      previous_class_id: students.previousClassId,
      school_name: students.schoolName,
      school_class: students.schoolClass,
      is_frozen: students.isFrozen,
      deleted_at: students.deletedAt,
      created_at: students.createdAt,
      updated_at: students.updatedAt,
    };
  }

  private studentWithClassSelection(includeDiscount: boolean) {
    return {
      ...this.studentSelection(),
      class_name: classes.className,
      class_teacher_id: classes.teacherId,
      effective_teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
      ...(includeDiscount
        ? {
            discount_id: this.activeDiscountColumn('discount_id'),
            is_discounted: sql`(${this.activeDiscountColumn('discount_id')} IS NOT NULL)`,
            discount_kind: this.activeDiscountColumn('discount_kind'),
            discount_value_type: this.activeDiscountColumn('discount_type'),
            discount_value: this.activeDiscountColumn('value'),
            discount_original_price: this.activeDiscountColumn('original_price'),
            discount_reason: this.activeDiscountColumn('reason'),
          }
        : {}),
    };
  }

  private activeDiscountColumn(columnName: string) {
    return sql`(
      SELECT ${sql.raw(columnName)}
      FROM discounts d
      WHERE d.student_id = ${students.studentId} AND d.active = TRUE
      ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
      LIMIT 1
    )`;
  }
}
