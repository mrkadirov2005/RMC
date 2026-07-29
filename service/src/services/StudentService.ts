import { Pool } from 'pg';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { BaseService } from './BaseService';

const { assignments, attendance, grades, payments, students } = require('../db/schema');
const poolModule = require('../db/pool');

export interface Student {
  id?: number;
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  gender: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
  school_name?: string | null;
  school_class?: string | null;
}

export interface CreateStudentData extends Omit<Student, 'id'> {}

export class StudentService extends BaseService {
  private readonly drizzle: any;

  constructor(pool: Pool) {
    super(pool);
    this.drizzle = (pool as any).db || poolModule.db;
  }

  async createStudent(studentData: CreateStudentData): Promise<Student> {
    return this.create('students', studentData);
  }

  async getStudentById(id: number): Promise<Student | null> {
    return this.findById('students', id);
  }

  async getAllStudents(filters: Partial<Student> = {}): Promise<Student[]> {
    return this.findAll('students', filters);
  }

  async getStudentsByCenter(centerId: number): Promise<Student[]> {
    return this.findAll('students', { center_id: centerId });
  }

  async getStudentsByTeacher(teacherId: number): Promise<Student[]> {
    return this.findAll('students', { teacher_id: teacherId });
  }

  async getStudentsByClass(classId: number): Promise<Student[]> {
    return this.findAll('students', { class_id: classId });
  }

  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student | null> {
    return this.update('students', id, studentData);
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.delete('students', id);
  }

  async getStudentCount(filters: Partial<Student> = {}): Promise<number> {
    return this.count('students', filters);
  }

  async searchStudents(searchTerm: string, centerId?: number): Promise<Student[]> {
    const search = `%${searchTerm}%`;
    const conditions: any[] = [
      or(
        ilike(students.firstName, search),
        ilike(students.lastName, search),
        ilike(students.enrollmentNumber, search)
      ),
    ];
    if (centerId) conditions.push(eq(students.centerId, centerId));

    return this.drizzle
      .select({
        student_id: students.studentId,
        center_id: students.centerId,
        enrollment_number: students.enrollmentNumber,
        first_name: students.firstName,
        last_name: students.lastName,
        email: students.email,
        phone: students.phone,
        date_of_birth: students.dateOfBirth,
        parent_name: students.parentName,
        parent_phone: students.parentPhone,
        gender: students.gender,
        status: students.status,
        teacher_id: students.teacherId,
        class_id: students.classId,
        school_name: students.schoolName,
        school_class: students.schoolClass,
      })
      .from(students)
      .where(and(...conditions))
      .orderBy(students.firstName, students.lastName);
  }

  async updateStudentStatus(id: number, status: string): Promise<Student | null> {
    return this.update('students', id, { status });
  }

  async assignStudentToClass(studentId: number, classId: number): Promise<Student | null> {
    return this.update('students', studentId, { class_id: classId });
  }

  async assignStudentToTeacher(studentId: number, teacherId: number): Promise<Student | null> {
    return this.update('students', studentId, { teacher_id: teacherId });
  }

  // Get student statistics
  async getStudentStatistics(studentId: number): Promise<any> {
    const rows = await this.drizzle
      .select({
        student_id: students.studentId,
        first_name: students.firstName,
        last_name: students.lastName,
        attendance_count: sql`COUNT(DISTINCT ${attendance.attendanceId})::int`,
        present_count: sql`COUNT(DISTINCT CASE WHEN ${attendance.status} IN ('Present', 'Late') THEN ${attendance.attendanceId} END)::int`,
        grade_count: sql`COUNT(DISTINCT ${grades.gradeId})::int`,
        average_grade: sql`AVG(${grades.percentage})`,
        payment_count: sql`COUNT(DISTINCT ${payments.paymentId})::int`,
        total_paid: sql`COALESCE(SUM(${payments.amount}), 0)`,
        assignment_count: sql`COUNT(DISTINCT ${assignments.assignmentId})::int`,
      })
      .from(students)
      .leftJoin(attendance, eq(students.studentId, attendance.studentId))
      .leftJoin(grades, eq(students.studentId, grades.studentId))
      .leftJoin(payments, eq(students.studentId, payments.studentId))
      .leftJoin(assignments, eq(students.classId, assignments.classId))
      .where(eq(students.studentId, studentId))
      .groupBy(students.studentId, students.firstName, students.lastName);
    return rows[0] || null;
  }
}
