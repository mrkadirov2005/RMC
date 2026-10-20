import { formatGroupLabel } from '@/shared/groupLabel';
import type { ArchiveTabConfig } from './archiveFilters';

// What each archive tab searches and filters by. labels: the page's t().

export type ArchiveEntity = 'students' | 'teachers' | 'classes' | 'payments' | 'sessions';

const join = (...parts: unknown[]) => parts.filter(Boolean).join(' ').trim();
export const teacherName = (row: any) => join(row?.teacher_first_name, row?.teacher_last_name);

export const buildArchiveTabs = (t: (key: string) => string): Record<ArchiveEntity, ArchiveTabConfig<any> & { searchPlaceholder: string }> => ({
  students: {
    searchPlaceholder: t('Search by name, phone, enrollment, group or note...'),
    searchText: (row) => [row.first_name, row.last_name, row.enrollment_number, row.phone, row.parent_phone, row.email, row.class_name, row.class_code, teacherName(row), row.reason_name, row.reason_note],
    selects: [
      { key: 'reason', label: t('Reason'), value: (row) => row.reason_id, optionLabel: (row) => row.reason_name || `#${row.reason_id}`, emptyLabel: t('No reason recorded') },
      { key: 'group', label: t('Group'), value: (row) => row.class_id, optionLabel: (row) => row.class_name || `#${row.class_id}`, emptyLabel: t('No group') },
      { key: 'teacher', label: t('Teacher'), value: (row) => row.teacher_id, optionLabel: (row) => teacherName(row) || `#${row.teacher_id}`, emptyLabel: t('No teacher') },
      { key: 'status', label: t('Status'), value: (row) => row.status, optionLabel: (row) => t(row.status) },
    ],
    date: (row) => row.deleted_at,
  },
  teachers: {
    searchPlaceholder: t('Search by name, employee ID, email or phone...'),
    searchText: (row) => [row.first_name, row.last_name, row.employee_id, row.email, row.phone],
    selects: [{ key: 'status', label: t('Status'), value: (row) => row.status, optionLabel: (row) => t(row.status) }],
    date: (row) => row.deleted_at,
  },
  classes: {
    searchPlaceholder: t('Search by group, code, room or teacher...'),
    searchText: (row) => [row.class_name, row.class_code, formatGroupLabel(row), row.room_number, teacherName(row)],
    selects: [
      { key: 'teacher', label: t('Teacher'), value: (row) => row.teacher_id, optionLabel: (row) => teacherName(row) || `#${row.teacher_id}`, emptyLabel: t('No teacher') },
      { key: 'room', label: t('Room'), value: (row) => row.room_number, emptyLabel: t('No room') },
      { key: 'level', label: t('Level'), value: (row) => row.level },
    ],
    date: (row) => row.deleted_at,
  },
  payments: {
    searchPlaceholder: t('Search by receipt, student, enrollment, amount or note...'),
    searchText: (row) => [row.receipt_number, row.payment_id && `#${row.payment_id}`, row.student_first_name, row.student_last_name, row.enrollment_number, row.amount, row.notes],
    selects: [
      { key: 'status', label: t('Status'), value: (row) => row.payment_status, optionLabel: (row) => t(row.payment_status) },
      { key: 'method', label: t('Payment method'), value: (row) => row.payment_method, optionLabel: (row) => t(row.payment_method) },
      { key: 'type', label: t('Payment type'), value: (row) => row.payment_type, optionLabel: (row) => t(row.payment_type) },
    ],
    date: (row) => row.deleted_at,
  },
  sessions: {
    searchPlaceholder: t('Search by group or teacher...'),
    searchText: (row) => [row.class_name, row.class_code, teacherName(row), row.session_date, row.start_time],
    selects: [
      { key: 'group', label: t('Group'), value: (row) => row.class_id, optionLabel: (row) => row.class_name || `#${row.class_id}`, emptyLabel: t('No group') },
      { key: 'teacher', label: t('Teacher'), value: (row) => row.teacher_id, optionLabel: (row) => teacherName(row) || `#${row.teacher_id}`, emptyLabel: t('No teacher') },
    ],
    date: (row) => row.deleted_at,
  },
});
