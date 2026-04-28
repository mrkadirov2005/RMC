// Source file for the constants.ts area in the owner feature.

import {
  Building2,
  BarChart3,
  CircleUserRound,
  GraduationCap,
  Shield,
  Users,
} from 'lucide-react';
import { PERMISSION_CODES } from '../../types';
import type {
  OwnerManagerFieldDef,
  OwnerManagerMeta,
  OwnerManagerTabType,
} from './types';

export const OWNER_MANAGER_TAB_META: Record<OwnerManagerTabType, OwnerManagerMeta> = {
  centers: {
    label: 'Centers',
    description: 'Manage branches, codes, and contact details.',
    icon: Building2,
  },
  owners: {
    label: 'Owners',
    description: 'Manage owner accounts and access status.',
    icon: Shield,
  },
  superusers: {
    label: 'Superusers',
    description: 'Manage center admins for a selected branch.',
    icon: CircleUserRound,
  },
  teachers: {
    label: 'Teachers',
    description: 'Manage teacher profiles inside the active branch.',
    icon: Users,
  },
  students: {
    label: 'Students',
    description: 'Manage student records and their assignment data.',
    icon: GraduationCap,
  },
  statistics: {
    label: 'Statistics',
    description: 'View combined stats and charts across every branch.',
    icon: BarChart3,
  },
};

export const OWNER_MANAGER_STATUS_OPTIONS: Record<OwnerManagerTabType, string[]> = {
  centers: ['Active', 'Inactive'],
  owners: ['Active', 'Inactive'],
  superusers: ['Active', 'Inactive', 'Suspended'],
  teachers: ['Active', 'Inactive', 'Retired'],
  students: ['Active', 'Inactive', 'Graduated', 'Removed'],
  statistics: ['Active'],
};

export const OWNER_MANAGER_ADMIN_PERMISSION_OPTIONS = [
  { code: PERMISSION_CODES.CRUD_STUDENT, label: 'Students' },
  { code: PERMISSION_CODES.CRUD_TEACHER, label: 'Teachers' },
  { code: PERMISSION_CODES.CRUD_CLASS, label: 'Classes' },
  { code: PERMISSION_CODES.CRUD_ROOM, label: 'Rooms' },
  { code: PERMISSION_CODES.CRUD_PAYMENT, label: 'Payments' },
  { code: PERMISSION_CODES.VIEW_FINANCE, label: 'Finance' },
  { code: PERMISSION_CODES.CRUD_GRADE, label: 'Grades' },
  { code: PERMISSION_CODES.CRUD_ATTENDANCE, label: 'Attendance' },
  { code: PERMISSION_CODES.CRUD_ASSIGNMENT, label: 'Assignments' },
  { code: PERMISSION_CODES.CRUD_SUBJECT, label: 'Subjects' },
  { code: PERMISSION_CODES.CRUD_DEBT, label: 'Debts' },
  { code: PERMISSION_CODES.MANAGE_TESTS, label: 'Tests' },
  { code: PERMISSION_CODES.MANAGE_USERS, label: 'Settings' },
];

export const OWNER_MANAGER_FIELDS: Record<OwnerManagerTabType, OwnerManagerFieldDef[]> = {
  centers: [
    { name: 'center_name', label: 'Center Name', type: 'text', required: true },
    { name: 'center_code', label: 'Center Code', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'text', required: true },
    { name: 'city', label: 'City', type: 'text', required: true },
    { name: 'principal_name', label: 'Principal Name', type: 'text', required: true },
  ],
  owners: [
    { name: 'username', label: 'Username', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Password', type: 'password', required: true },
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'text', required: true },
  ],
  superusers: [
    { name: 'branch_id', label: 'Branch', type: 'number', required: true },
    { name: 'username', label: 'Username', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Password', type: 'password', required: true },
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'text', required: true },
  ],
  teachers: [
    { name: 'center_id', label: 'Center', type: 'number', required: true },
    { name: 'employee_id', label: 'Employee ID', type: 'text', required: true },
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'gender', label: 'Gender', type: 'text', required: true },
    { name: 'qualification', label: 'Qualification', type: 'text', required: true },
    { name: 'specialization', label: 'Specialization', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'text', required: true },
  ],
  students: [
    { name: 'center_id', label: 'Center', type: 'number', required: true },
    { name: 'enrollment_number', label: 'Enrollment Number', type: 'text', required: true },
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'parent_name', label: 'Parent Name', type: 'text', required: true },
    { name: 'parent_phone', label: 'Parent Phone', type: 'text', required: true },
    { name: 'school_name', label: 'School (optional)', type: 'text' },
    { name: 'school_class', label: 'School Class (optional)', type: 'text' },
    { name: 'gender', label: 'Gender', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'text', required: true },
    { name: 'teacher_id', label: 'Teacher ID', type: 'number', required: true },
    { name: 'class_id', label: 'Class ID', type: 'number', required: true },
  ],
  statistics: [],
};
