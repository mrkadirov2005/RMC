import type { OwnerManagerStatisticsCollections } from '../../types';
import type { StudentStatSlide, StudentStatRow } from './types';

const countByStatus = (data: any[], status: string) =>
  data.filter((item) => String(item?.status || '').toLowerCase() === status).length;

const countByGender = (data: any[], gender: string) =>
  data.filter((item) => String(item?.gender || '').toLowerCase() === gender).length;

const getAge = (value: unknown) => {
  if (!value) return null;
  const birthDate = new Date(String(value));
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 && age < 100 ? age : null;
};

const inferSubjectBucket = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('koreys')) return 'Koreys tili';
  if (value.includes('arab')) return 'Arab tili';
  if (value.includes('rus')) return 'Rus tili';
  if (value.includes('matematika')) return 'Matematika';
  if (value.includes('ielts')) return 'IELTS';
  if (value.includes('grammar') || value.includes('grammatika')) return 'Grammar';
  if (value.includes('kids')) return 'Kids English';
  if (value.includes('starter')) return 'Starter';
  if (value.includes('flyer')) return 'Flyers';
  if (value.includes('mover')) return 'Movers';
  if (value.includes('a1')) return 'A1';
  if (value.includes('a2')) return 'A2';
  if (value.includes('b1')) return 'B1';
  if (value.includes('b2')) return 'B2';
  return 'Other';
};

const topCounts = (values: string[], fallback = 'Unknown'): StudentStatRow[] => {
  const map = new Map<string, number>();
  values.forEach((value) => {
    const label = String(value || '').trim() || fallback;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const withColors = (rows: StudentStatRow[], colors: string[]) =>
  rows.map((row, index) => ({ ...row, color: colors[index % colors.length] }));

const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#06b6d4', '#64748b'];

export const buildStudentStatSlides = (
  data: any[],
  collections: OwnerManagerStatisticsCollections
): StudentStatSlide[] => {
  const total = data.length;
  const classLookup = new Map<number, any>();
  collections.classes.forEach((cls) => {
    const id = Number(cls?.class_id || cls?.id || 0);
    if (id) classLookup.set(id, cls);
  });

  const active = countByStatus(data, 'active');
  const inClasses = data.filter((student) => Number(student?.class_id || 0) > 0).length;
  const overview = [
    { label: 'Total Students', count: total },
    { label: 'Active', count: active },
    { label: 'In Classes', count: inClasses },
    { label: 'Graduated', count: countByStatus(data, 'graduated') },
  ];

  return [
    { title: 'Overview', description: 'Main student numbers at a glance.', rows: withColors(overview, chartColors), total },
    {
      title: 'Gender',
      description: 'Student distribution by gender.',
      rows: withColors([
        { label: 'Male', count: countByGender(data, 'male') },
        { label: 'Female', count: countByGender(data, 'female') },
        { label: 'Other', count: Math.max(total - countByGender(data, 'male') - countByGender(data, 'female'), 0) },
      ], chartColors),
      total,
    },
    {
      title: 'Status',
      description: 'Enrollment status mix.',
      rows: withColors([
        { label: 'Active', count: active },
        { label: 'Graduated', count: countByStatus(data, 'graduated') },
        { label: 'Inactive', count: countByStatus(data, 'inactive') },
        { label: 'Removed', count: countByStatus(data, 'removed') },
      ], chartColors),
      total,
    },
    {
      title: 'Schools',
      description: 'Where students study outside the center.',
      rows: withColors(topCounts(data.map((student) => student?.school_name), 'No school'), chartColors),
      total,
    },
    {
      title: 'School Classes',
      description: 'School grade/class distribution.',
      rows: withColors(topCounts(data.map((student) => student?.school_class), 'No school class'), chartColors),
      total,
    },
    {
      title: 'Groups',
      description: 'CRM group distribution.',
      rows: withColors(topCounts(data.map((student) => {
        const cls = classLookup.get(Number(student?.class_id || 0));
        return cls?.class_name || student?.class_name || 'No group';
      }), 'No group'), chartColors),
      total,
    },
    {
      title: 'Ages',
      description: 'Age range distribution.',
      rows: withColors(topCounts(data.map((student) => {
        const age = getAge(student?.date_of_birth);
        if (age == null) return 'No age';
        if (age <= 6) return '0-6';
        if (age <= 9) return '7-9';
        if (age <= 12) return '10-12';
        if (age <= 15) return '13-15';
        if (age <= 18) return '16-18';
        return '19+';
      }), 'No age'), chartColors),
      total,
    },
    {
      title: 'Subjects',
      description: 'Subject distribution inferred from groups.',
      rows: withColors(topCounts(data.map((student) => {
        const cls = classLookup.get(Number(student?.class_id || 0));
        return inferSubjectBucket(String(cls?.class_name || student?.class_name || ''));
      }), 'Other'), chartColors),
      total,
    },
    {
      title: 'Assignments',
      description: 'Group and teacher assignment health.',
      rows: withColors([
        { label: 'Assigned to group', count: inClasses },
        { label: 'No group', count: data.filter((student) => !Number(student?.class_id || 0)).length },
        { label: 'Assigned to teacher', count: data.filter((student) => Number(student?.teacher_id || 0) > 0).length },
        { label: 'No teacher', count: data.filter((student) => !Number(student?.teacher_id || 0)).length },
      ], chartColors),
      total,
    },
  ];
};
