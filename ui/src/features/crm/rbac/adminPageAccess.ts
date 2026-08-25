import { PERMISSION_CODES } from '@/types';

export const ADMIN_PAGE_ACCESS = [
  { label: 'Dashboard', path: '/dashboard', permission: PERMISSION_CODES.VIEW_DASHBOARD },
  { label: 'Students', path: '/students', permission: PERMISSION_CODES.CRUD_STUDENT },
  { label: 'Telegram Leads', path: '/telegram-registrations', permission: PERMISSION_CODES.VIEW_TELEGRAM_LEADS },
  { label: 'Archive', path: '/archive', permission: PERMISSION_CODES.VIEW_ARCHIVE },
  { label: 'Retention', path: '/retention', permission: PERMISSION_CODES.VIEW_RETENTION },
  { label: 'Teachers', path: '/teachers', permission: PERMISSION_CODES.CRUD_TEACHER },
  { label: 'Classes', path: '/classes', permission: PERMISSION_CODES.CRUD_CLASS },
  { label: 'Rooms', path: '/rooms', permission: PERMISSION_CODES.CRUD_ROOM },
  { label: 'Calendar', path: '/calendar', permission: PERMISSION_CODES.VIEW_CALENDAR },
  { label: 'Tests', path: '/tests', permission: PERMISSION_CODES.MANAGE_TESTS },
  { label: 'Payments', path: '/payments', permission: PERMISSION_CODES.CRUD_PAYMENT },
  { label: 'Salary', path: '/salary', permission: PERMISSION_CODES.MANAGE_SALARY },
  { label: 'Assignments', path: '/assignments', permission: PERMISSION_CODES.CRUD_ASSIGNMENT },
  { label: 'Subjects', path: '/subjects', permission: PERMISSION_CODES.CRUD_SUBJECT },
  { label: 'Debts', path: '/debts', permission: PERMISSION_CODES.CRUD_DEBT },
] as const;
