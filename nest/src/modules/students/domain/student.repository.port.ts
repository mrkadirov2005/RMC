import type { Student } from './student.entity';

export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');

export interface StudentRepositoryPort {
  findAllWithClass(centerId?: number, teacherId?: number): Promise<Student[]>;
  findByIdWithClass(id: number, centerId?: number, teacherId?: number): Promise<Student | null>;
  findDeletedWithClassAndTeacher(centerId?: number): Promise<Student[]>;
  findByClassIncludingTransferred(classId: number, centerId?: number, teacherId?: number): Promise<Student[]>;
  insert(payload: any): Promise<Student>;
  update(id: number, payload: any, centerId?: number, teacherId?: number): Promise<Student | null>;
  softDelete(id: number, centerId?: number, teacherId?: number): Promise<Student | null>;
  purge(id: number, centerId?: number, teacherId?: number): Promise<Student | null>;
  transferToClass(id: number, targetClassId: number, centerId?: number, teacherId?: number): Promise<any>;
  findByUsername(username: string): Promise<Student | null>;
}
