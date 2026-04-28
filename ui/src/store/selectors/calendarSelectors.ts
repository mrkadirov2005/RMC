// Redux selectors for derived application state.

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { selectClassItems, selectStudentItems } from './entitySelectors';

// Handles to number.
const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Handles make select calendar classes for user.
export const makeSelectCalendarClassesForUser = () =>
  createSelector(
    [selectClassItems, (_: RootState, user: any) => user],
    (classes, user) => {
      if (!user || user.userType === 'student') return [];
      if (user.userType !== 'teacher') return classes;
      const teacherId = toNumber(user.id);
      return classes.filter((cls) => toNumber(cls?.teacher_id) === teacherId);
    }
  );

// Handles make select students by class id.
export const makeSelectStudentsByClassId = () =>
  createSelector(
    [selectStudentItems, (_: RootState, classId: number | null | undefined) => toNumber(classId)],
    (students, classId) => {
      if (!classId) return [];
      return students.filter((student) => toNumber(student?.class_id) === classId);
    }
  );
