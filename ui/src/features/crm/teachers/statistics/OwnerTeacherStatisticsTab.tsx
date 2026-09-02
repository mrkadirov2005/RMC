import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchClasses, fetchClassesForce } from '@/slices/classesSlice';
import { fetchStudents, fetchStudentsForce } from '@/slices/studentsSlice';
import { fetchTeachers, fetchTeachersForce } from '@/slices/teachersSlice';
import { getStoredActiveCenterId } from '@/shared/auth/authStorage';
import TeacherStatisticsTab from '../../../teacher/statistics/TeacherStatisticsTab';

// Owner-wide statistics tab: browse lesson score statistics across every teacher's classes.
export const OwnerTeacherStatisticsTab = () => {
  const dispatch = useAppDispatch();
  const classes = useAppSelector((state) => state.classes.items);
  const students = useAppSelector((state) => state.students.items);
  const teachers = useAppSelector((state) => state.teachers.items);
  const [activeCenterId, setActiveCenterId] = useState(getStoredActiveCenterId());

  useEffect(() => {
    dispatch(fetchClasses());
    dispatch(fetchStudents());
    dispatch(fetchTeachers());
  }, [dispatch]);

  // Switching branches (active center) changes which classes/students/teachers the server
  // scopes requests to, but nothing here otherwise triggers a refetch - without this, the tab
  // kept showing whatever the previous branch had loaded. Force a fresh fetch, and remount
  // TeacherStatisticsTab (via `key`) so any drilled-down selection from the old branch (a
  // specific class/teacher/date range) resets instead of pointing at stale, wrong-branch data.
  useEffect(() => {
    const handleActiveCenterChanged = () => {
      setActiveCenterId(getStoredActiveCenterId());
      dispatch(fetchClassesForce());
      dispatch(fetchStudentsForce());
      dispatch(fetchTeachersForce());
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch]);

  return <TeacherStatisticsTab key={activeCenterId ?? 'all'} classes={classes} students={students} teachers={teachers} />;
};

export default OwnerTeacherStatisticsTab;
