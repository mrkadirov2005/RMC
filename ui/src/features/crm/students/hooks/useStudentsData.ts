import { useEffect, useState } from 'react';
import { classAPI, studentAPI } from '../../../../shared/api/api';
import { fetchTeachers, fetchCenters, fetchClasses } from '../../../../utils/dropdownOptions';
import { useAppSelector } from '../../hooks';
import { useCRUD } from '../../hooks/useCRUD';
import type { Class, Student } from '../types';

interface Option { id?: number; label: string; value: string | number }

export const useStudentsData = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const [state, actions] = useCRUD<Student>(studentAPI, 'Student');
  const [classes, setClasses] = useState<Class[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<Option[]>([]);
  const [centerOptions, setCenterOptions] = useState<Option[]>([]);
  const [classOptions, setClassOptions] = useState<Option[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => { actions.fetchAll(); loadClasses(); loadDropdownOptions(); }, []);

  const loadClasses = async () => { setLoadingClasses(true); try { const response = await classAPI.getAll(); const allClasses = response.data || response; setClasses(Array.isArray(allClasses) ? allClasses : []); } finally { setLoadingClasses(false); } };
  const loadDropdownOptions = async () => { setIsLoadingOptions(true); try { const requests = [fetchTeachers(), fetchClasses()]; const [teachers, classesRes] = await Promise.all(requests); setTeacherOptions(teachers); setClassOptions(classesRes); if (isOwner) { setCenterOptions(await fetchCenters()); } else { setCenterOptions([]); } } finally { setIsLoadingOptions(false); } };

  return { state, actions, classes, teacherOptions, centerOptions, classOptions, loadingClasses, isLoadingOptions, isOwner };
};
