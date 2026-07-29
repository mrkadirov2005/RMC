import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { classes, subjects } from '../../../database/schema';

@Injectable()
export class SubjectsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  listSubjects(centerId?: number, teacherId?: number) {
    return this.findSubjects({}, centerId, teacherId);
  }

  async getSubject(id: number, centerId?: number, teacherId?: number) {
    const rows = await this.findSubjects({ subjectId: id }, centerId, teacherId);
    if (!rows[0]) throw new NotFoundException('Subject not found');
    return rows[0];
  }

  listByClass(classId: number, centerId?: number, teacherId?: number) {
    return this.findSubjects({ classId }, centerId, teacherId);
  }

  async createSubject(body: any, centerId?: number) {
    const resolvedCenterId = centerId ?? body.center_id;
    if (resolvedCenterId && !(await this.classInCenter(Number(body.class_id), Number(resolvedCenterId)))) {
      throw new BadRequestException('Class does not belong to this center.');
    }
    const existing = await this.findSubjects({ classId: Number(body.class_id) }, resolvedCenterId);
    if (existing.length > 0) throw new ConflictException('This class already has an assigned subject.');
    const rows = await this.db
      .insert(subjects)
      .values({
        centerId: resolvedCenterId,
        classId: Number(body.class_id),
        subjectName: body.subject_name,
        subjectCode: body.subject_code,
        teacherId: body.teacher_id,
        totalMarks: body.total_marks || 100,
        passingMarks: body.passing_marks || 40,
      })
      .returning();
    return rows[0];
  }

  async updateSubject(id: number, body: any, centerId?: number, teacherId?: number) {
    const existing = await this.getSubject(id, centerId, teacherId);
    const classId = Number(body.class_id ?? existing.classId);
    if (centerId && !(await this.classInCenter(classId, centerId))) {
      throw new BadRequestException('Class does not belong to this center.');
    }
    const classSubjects = await this.findSubjects({ classId }, centerId, teacherId);
    if (classSubjects.some((subject: any) => Number(subject.subjectId) !== id)) {
      throw new ConflictException('This class already has an assigned subject.');
    }
    const rows = await this.db
      .update(subjects)
      .set({
        classId: sql`COALESCE(${classId}, ${subjects.classId})`,
        subjectName: sql`COALESCE(${body.subject_name ?? null}, ${subjects.subjectName})`,
        subjectCode: sql`COALESCE(${body.subject_code ?? null}, ${subjects.subjectCode})`,
        teacherId: sql`COALESCE(${body.teacher_id ?? null}, ${subjects.teacherId})`,
        totalMarks: sql`COALESCE(${body.total_marks ?? null}, ${subjects.totalMarks})`,
        passingMarks: sql`COALESCE(${body.passing_marks ?? null}, ${subjects.passingMarks})`,
      })
      .where(eq(subjects.subjectId, id))
      .returning();
    if (!rows[0]) throw new NotFoundException('Subject not found');
    return rows[0];
  }

  async deleteSubject(id: number, centerId?: number, teacherId?: number) {
    await this.getSubject(id, centerId, teacherId);
    const rows = await this.db.delete(subjects).where(eq(subjects.subjectId, id)).returning();
    if (!rows[0]) throw new NotFoundException('Subject not found');
    return { message: 'Subject deleted successfully', subject: rows[0] };
  }

  private async findSubjects(filters: { subjectId?: number; classId?: number }, centerId?: number, teacherId?: number) {
    const conditions: any[] = [];
    if (filters.subjectId) conditions.push(eq(subjects.subjectId, filters.subjectId));
    if (filters.classId) conditions.push(eq(subjects.classId, filters.classId));
    if (centerId) conditions.push(eq(classes.centerId, centerId), isNull(classes.deletedAt));
    if (teacherId) conditions.push(eq(subjects.teacherId, teacherId));

    let builder = this.db.select(this.subjectSelection()).from(subjects);
    if (centerId) builder = builder.innerJoin(classes, eq(classes.classId, subjects.classId));
    if (conditions.length) builder = builder.where(and(...conditions));
    return filters.classId ? builder.orderBy(subjects.subjectName) : builder.orderBy(desc(subjects.subjectId));
  }

  private async classInCenter(classId: number, centerId: number) {
    const rows = await this.db
      .select({ classId: classes.classId })
      .from(classes)
      .where(and(eq(classes.classId, classId), eq(classes.centerId, centerId), isNull(classes.deletedAt)))
      .limit(1);
    return Boolean(rows[0]);
  }

  private subjectSelection() {
    return {
      subjectId: subjects.subjectId,
      centerId: subjects.centerId,
      classId: subjects.classId,
      subjectName: subjects.subjectName,
      subjectCode: subjects.subjectCode,
      teacherId: subjects.teacherId,
      totalMarks: subjects.totalMarks,
      passingMarks: subjects.passingMarks,
    };
  }
}
