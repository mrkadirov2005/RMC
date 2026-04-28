// Redux selectors for derived application state.

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface SelectOption {
  id: number;
  label: string;
  value: string | number;
}

// Handles to number id.
const toNumberId = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

// Handles first id.
const firstId = (item: any, keys: string[]): number | null => {
  for (const key of keys) {
    const id = toNumberId(item?.[key]);
    if (id) return id;
  }
  return null;
};

// Selects student items.
export const selectStudentItems = (state: RootState) => state.students.items as any[];
// Selects teacher items.
export const selectTeacherItems = (state: RootState) => state.teachers.items as any[];
// Selects class items.
export const selectClassItems = (state: RootState) => state.classes.items as any[];
// Selects subject items.
export const selectSubjectItems = (state: RootState) => state.subjects.items as any[];
// Selects center items.
export const selectCenterItems = (state: RootState) => state.centers.items as any[];
// Selects payment items.
export const selectPaymentItems = (state: RootState) => state.payments.items as any[];

export const selectStudentOptions = createSelector([selectStudentItems], (students): SelectOption[] =>
  students
    .map<SelectOption | null>((student) => {
      const id = firstId(student, ['student_id', 'id']);
      if (!id) return null;
      const firstName = String(student?.first_name || '').trim();
      const lastName = String(student?.last_name || '').trim();
      const enrollment = String(student?.enrollment_number || '').trim();
      const baseLabel = [firstName, lastName].filter(Boolean).join(' ').trim() || `Student ${id}`;
      return {
        id,
        value: id,
        label: enrollment ? `${baseLabel} (${enrollment})` : baseLabel,
      };
    })
    .filter((option): option is SelectOption => option !== null)
);

export const selectTeacherOptions = createSelector([selectTeacherItems], (teachers): SelectOption[] =>
  teachers
    .map<SelectOption | null>((teacher) => {
      const id = firstId(teacher, ['teacher_id', 'id']);
      if (!id) return null;
      const firstName = String(teacher?.first_name || '').trim();
      const lastName = String(teacher?.last_name || '').trim();
      const label = [firstName, lastName].filter(Boolean).join(' ').trim() || `Teacher ${id}`;
      return {
        id,
        value: id,
        label,
      };
    })
    .filter((option): option is SelectOption => option !== null)
);

export const selectClassOptions = createSelector([selectClassItems], (classes): SelectOption[] =>
  classes
    .map<SelectOption | null>((cls) => {
      const id = firstId(cls, ['class_id', 'id']);
      if (!id) return null;
      const className = String(cls?.class_name || '').trim();
      const level = cls?.level != null ? `Level ${cls.level}` : '';
      const section = String(cls?.section || '').trim();
      const details = [level, section].filter(Boolean).join(' ');
      return {
        id,
        value: id,
        label: details ? `${className} - ${details}` : className || `Class ${id}`,
      };
    })
    .filter((option): option is SelectOption => option !== null)
);

export const selectSubjectOptions = createSelector([selectSubjectItems], (subjects): SelectOption[] =>
  subjects
    .map<SelectOption | null>((subject) => {
      const id = firstId(subject, ['subject_id', 'id']);
      if (!id) return null;
      const name = String(subject?.subject_name || '').trim();
      return {
        id,
        value: id,
        label: name || `Subject ${id}`,
      };
    })
    .filter((option): option is SelectOption => option !== null)
);

export const selectCenterOptions = createSelector([selectCenterItems], (centers): SelectOption[] =>
  centers
    .map<SelectOption | null>((center) => {
      const id = firstId(center, ['center_id', 'id']);
      if (!id) return null;
      const name = String(center?.center_name || '').trim();
      const city = String(center?.city || '').trim();
      return {
        id,
        value: id,
        label: name || city || `Center ${id}`,
      };
    })
    .filter((option): option is SelectOption => option !== null)
);

export const selectPaymentOptions = createSelector([selectPaymentItems], (payments): SelectOption[] =>
  payments
    .map<SelectOption | null>((payment) => {
      const id = firstId(payment, ['payment_id', 'id']);
      if (!id) return null;
      const receipt = String(payment?.receipt_number || '').trim();
      const amount = Number(payment?.amount ?? 0);
      return {
        id,
        value: id,
        label: receipt ? `Receipt #${receipt} - ${amount}` : `Payment ${id} - ${amount}`,
      };
    })
    .filter((option): option is SelectOption => option !== null)
);

export const selectStudentsByIdMap = createSelector([selectStudentItems], (students) => {
  const map: Record<number, any> = {};
  for (const student of students) {
    const id = firstId(student, ['student_id', 'id']);
    if (id) map[id] = student;
  }
  return map;
});

export const selectTeachersByIdMap = createSelector([selectTeacherItems], (teachers) => {
  const map: Record<number, any> = {};
  for (const teacher of teachers) {
    const id = firstId(teacher, ['teacher_id', 'id']);
    if (id) map[id] = teacher;
  }
  return map;
});

export const selectClassesByIdMap = createSelector([selectClassItems], (classes) => {
  const map: Record<number, any> = {};
  for (const cls of classes) {
    const id = firstId(cls, ['class_id', 'id']);
    if (id) map[id] = cls;
  }
  return map;
});

// Handles make select student ids by teacher id.
export const makeSelectStudentIdsByTeacherId = () =>
  createSelector(
    [selectStudentItems, (_: RootState, teacherId: number) => teacherId],
    (students, teacherId) =>
      students
        .filter((student) => Number(student?.teacher_id) === teacherId)
        .map((student) => firstId(student, ['student_id', 'id']))
        .filter((id): id is number => Boolean(id))
  );

// Handles make select student ids by class id.
export const makeSelectStudentIdsByClassId = () =>
  createSelector(
    [selectStudentItems, (_: RootState, classId: number) => classId],
    (students, classId) =>
      students
        .filter((student) => Number(student?.class_id) === classId)
        .map((student) => firstId(student, ['student_id', 'id']))
        .filter((id): id is number => Boolean(id))
  );

// Selects entity options loading.
export const selectEntityOptionsLoading = (state: RootState) =>
  Boolean(
    state.students.loading ||
      state.teachers.loading ||
      state.classes.loading ||
      state.subjects.loading ||
      state.centers.loading ||
      state.payments.loading
  );
