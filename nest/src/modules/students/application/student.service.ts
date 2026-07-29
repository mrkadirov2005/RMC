import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hashPassword } from '../../../common/password';
import { DiscountService } from '../../discounts/application/discount.service';
import { STUDENT_REPOSITORY, type StudentRepositoryPort } from '../domain/student.repository.port';

@Injectable()
export class StudentService {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly students: StudentRepositoryPort,
    private readonly discounts: DiscountService,
  ) {}

  listStudents(centerId?: number, teacherId?: number) {
    return this.students.findAllWithClass(centerId, teacherId);
  }

  getStudent(id: number, centerId?: number, teacherId?: number) {
    return this.students.findByIdWithClass(id, centerId, teacherId);
  }

  listDeletedStudents(centerId?: number) {
    return this.students.findDeletedWithClassAndTeacher(centerId);
  }

  listClassStudentsWithTransfers(classId: number, centerId?: number, teacherId?: number) {
    return this.students.findByClassIncludingTransferred(classId, centerId, teacherId);
  }

  async createStudent(body: any) {
    const student = await this.students.insert({
      ...body,
      password_hash: body.password ? hashPassword(body.password) : null,
    });
    await this.syncStudentDiscount(student, body);
    return student;
  }

  async updateStudent(id: number, body: any, centerId?: number, teacherId?: number) {
    const payload = { ...body };
    if (payload.password) payload.password_hash = hashPassword(payload.password);
    const student = await this.students.update(id, payload, centerId, teacherId);
    if (!student) throw new NotFoundException('Student not found');
    await this.syncStudentDiscount(student, body, centerId);
    return student;
  }

  async deleteStudent(id: number, centerId?: number, teacherId?: number) {
    const row = await this.students.softDelete(id, centerId, teacherId);
    if (!row) throw new NotFoundException('Student not found');
    return { message: 'Student deleted successfully', student: row };
  }

  async purgeStudent(id: number, centerId?: number, teacherId?: number) {
    const row = await this.students.purge(id, centerId, teacherId);
    if (!row) throw new NotFoundException('Soft-deleted student not found');
    return { message: 'Student permanently deleted', student: row };
  }

  async transferStudent(id: number, targetClassId: number, centerId?: number, teacherId?: number) {
    const result = await this.students.transferToClass(id, targetClassId, centerId, teacherId);
    if (result?.error === 'not_found') throw new NotFoundException('Student not found');
    if (result?.error === 'target_class_not_found') throw new NotFoundException('Target class not found');
    return result;
  }

  assertListAccess(userType?: string) {
    if (userType === 'student') throw new ForbiddenException('Access denied.');
  }

  private async syncStudentDiscount(student: any, body: any, centerId?: number) {
    const studentId = Number(student?.student_id || student?.id || body.student_id || 0);
    const scopedCenterId = Number(student?.center_id || body.center_id || centerId || 0);
    if (!studentId || !scopedCenterId || body.is_discounted === undefined) return;

    const discountKind = body.discount_kind || 'serial_discount';
    const activeDiscount = await this.discounts.getActiveByStudent(studentId, scopedCenterId, discountKind);
    if (!body.is_discounted) {
      for (const kind of ['serial_discount', 'monthly_discount']) {
        const row = await this.discounts.getActiveByStudent(studentId, scopedCenterId, kind);
        if (row?.discount_id) await this.discounts.update(row.discount_id, { active: false } as any, scopedCenterId);
      }
      return;
    }

    if (body.discount_value == null) return;
    const originalPrice = Number(body.discount_original_price ?? body.original_price ?? activeDiscount?.original_price ?? 0);
    const valueType = body.discount_value_type || activeDiscount?.discount_type || 'fixed';
    const value = Number(body.discount_value || 0);
    const calculated = this.discounts.calculateDiscount(originalPrice, valueType, value);
    const payload = {
      student_id: studentId,
      center_id: scopedCenterId,
      discount_type: valueType,
      discount_kind: discountKind,
      value,
      original_price: originalPrice,
      final_price: calculated.finalAmount,
      reason: body.discount_reason || activeDiscount?.reason || null,
      active: true,
    };

    if (activeDiscount?.discount_id) {
      await this.discounts.update(activeDiscount.discount_id, payload as any, scopedCenterId);
    } else {
      await this.discounts.create(payload as any, scopedCenterId);
    }

    const otherKind = discountKind === 'serial_discount' ? 'monthly_discount' : 'serial_discount';
    const staleDiscount = await this.discounts.getActiveByStudent(studentId, scopedCenterId, otherKind);
    if (staleDiscount?.discount_id) await this.discounts.update(staleDiscount.discount_id, { active: false } as any, scopedCenterId);
  }
}
