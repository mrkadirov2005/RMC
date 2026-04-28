// React hooks for the crm feature.

import { useEffect } from 'react';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchStudents, fetchStudentsForce } from '../../../../slices/studentsSlice';
import { fetchClasses, fetchClassesForce } from '../../../../slices/classesSlice';
import { fetchTeachers, fetchTeachersForce } from '../../../../slices/teachersSlice';
import { fetchCenters } from '../../../../slices/centersSlice';
import {
  selectCenterOptions,
  selectClassOptions,
  selectTeacherOptions,
} from '../../../../store/selectors';
import type { Class, Student } from '../types';

// Provides students data.
export const useStudentsData = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
// Handles is owner.
  const isOwner = (user?.role || '').toLowerCase() === 'owner';

  // Server data from Redux store
  const students = useAppSelector((state) => state.students.items) as Student[];
  const studentsLoading = useAppSelector((state) => state.students.loading);
  const studentsError = useAppSelector((state) => state.students.error);
  const classItems = useAppSelector((state) => state.classes.items) as Class[];
  const classesLoading = useAppSelector((state) => state.classes.loading);
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const classOptions = useAppSelector(selectClassOptions);
  const allCenterOptions = useAppSelector(selectCenterOptions);
  const centerOptions = isOwner ? allCenterOptions : [];
  const isLoadingOptions = useAppSelector(
    (state) => state.teachers.loading || state.classes.loading || (isOwner && state.centers.loading)
  );

  // Expose shape compatible with what StudentsPage expects
  const state = { items: students, loading: studentsLoading, error: studentsError };
  const actions = {
    fetchAll: () => dispatch(fetchStudentsForce()),
  };

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchClasses());
    dispatch(fetchTeachers());
    if (isOwner) {
      dispatch(fetchCenters());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchStudentsForce());
      dispatch(fetchClassesForce());
      dispatch(fetchTeachersForce());
      if (isOwner) {
        dispatch(fetchCenters());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isOwner]);

  return {
    state,
    actions,
    classes: classItems,
    teacherOptions,
    centerOptions,
    classOptions,
    loadingClasses: classesLoading,
    isLoadingOptions,
    isOwner,
  };
};
