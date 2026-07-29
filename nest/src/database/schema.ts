import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
};

export const appSettings = pgTable('app_settings', {
  settingId: serial('setting_id').primaryKey(),
  centerId: integer('center_id'),
  settingKey: varchar('setting_key', { length: 100 }).notNull(),
  settingValue: jsonb('setting_value').notNull(),
  ...timestamps,
});

export const assignments = pgTable('assignments', {
  assignmentId: serial('assignment_id').primaryKey(),
  centerId: integer('center_id'),
  classId: integer('class_id'),
  subjectId: integer('subject_id'),
  teacherId: integer('teacher_id'),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  dueDate: timestamp('due_date'),
  ...timestamps,
});

export const attendance = pgTable('attendance', {
  attendanceId: serial('attendance_id').primaryKey(),
  centerId: integer('center_id'),
  studentId: integer('student_id'),
  classId: integer('class_id'),
  sessionId: integer('session_id'),
  attendanceDate: date('attendance_date'),
  status: varchar('status', { length: 50 }),
  notes: text('notes'),
  ...timestamps,
});

export const auditLogs = pgTable('audit_logs', {
  auditLogId: serial('audit_log_id').primaryKey(),
  centerId: integer('center_id'),
  userType: varchar('user_type', { length: 50 }),
  userId: integer('user_id'),
  action: varchar('action', { length: 100 }),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: integer('entity_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 100 }),
  createdAt: timestamp('created_at'),
});

export const centers = pgTable('edu_centers', {
  centerId: serial('center_id').primaryKey(),
  centerName: varchar('center_name', { length: 255 }),
  centerCode: varchar('center_code', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  principalName: varchar('principal_name', { length: 255 }),
  ...timestamps,
});

export const classes = pgTable('classes', {
  classId: serial('class_id').primaryKey(),
  centerId: integer('center_id'),
  className: varchar('class_name', { length: 100 }),
  classCode: varchar('class_code', { length: 50 }),
  level: integer('level'),
  section: text('section'),
  capacity: integer('capacity'),
  teacherId: integer('teacher_id'),
  roomNumber: varchar('room_number', { length: 50 }),
  totalStudents: integer('total_students'),
  paymentAmount: numeric('payment_amount'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
});

export const classSessions = pgTable('class_sessions', {
  sessionId: serial('session_id').primaryKey(),
  centerId: integer('center_id'),
  classId: integer('class_id'),
  teacherId: integer('teacher_id'),
  sessionDate: date('session_date'),
  startTime: time('start_time'),
  endTime: time('end_time'),
  status: varchar('status', { length: 50 }),
  ...timestamps,
});

export const debts = pgTable('debts', {
  debtId: serial('debt_id').primaryKey(),
  centerId: integer('center_id'),
  studentId: integer('student_id'),
  amount: numeric('amount'),
  paidAmount: numeric('paid_amount'),
  balance: numeric('balance'),
  status: varchar('status', { length: 50 }),
  dueDate: date('due_date'),
  ...timestamps,
});

export const discounts = pgTable('discounts', {
  discountId: serial('discount_id').primaryKey(),
  studentId: integer('student_id'),
  centerId: integer('center_id'),
  discountType: varchar('discount_type', { length: 20 }),
  discountKind: varchar('discount_kind', { length: 40 }),
  value: numeric('value'),
  originalPrice: numeric('original_price'),
  finalPrice: numeric('final_price'),
  reason: text('reason'),
  paymentPeriod: varchar('payment_period', { length: 20 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  active: boolean('active'),
  ...timestamps,
});

export const grades = pgTable('grades', {
  gradeId: serial('grade_id').primaryKey(),
  centerId: integer('center_id'),
  studentId: integer('student_id'),
  classId: integer('class_id'),
  subjectId: integer('subject_id'),
  sessionId: integer('session_id'),
  score: numeric('score'),
  gradeType: varchar('grade_type', { length: 50 }),
  notes: text('notes'),
  ...timestamps,
});

export const importJobs = pgTable('import_jobs', {
  importJobId: serial('import_job_id').primaryKey(),
  centerId: integer('center_id'),
  entity: varchar('entity', { length: 100 }),
  status: varchar('status', { length: 50 }),
  details: jsonb('details'),
  ...timestamps,
});

export const invoices = pgTable('invoices', {
  invoiceId: serial('invoice_id').primaryKey(),
  centerId: integer('center_id'),
  studentId: integer('student_id'),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  status: varchar('status', { length: 50 }),
  totalAmount: numeric('total_amount'),
  issueDate: date('issue_date'),
  dueDate: date('due_date'),
  ...timestamps,
});

export const notifications = pgTable('notifications', {
  notificationId: serial('notification_id').primaryKey(),
  centerId: integer('center_id'),
  userType: varchar('user_type', { length: 20 }),
  userId: integer('user_id'),
  title: varchar('title', { length: 200 }),
  message: text('message'),
  type: varchar('type', { length: 20 }),
  isRead: boolean('is_read'),
  createdAt: timestamp('created_at'),
});

export const owners = pgTable('owners', {
  ownerId: serial('owner_id').primaryKey(),
  username: varchar('username', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 50 }),
  ...timestamps,
});

export const parents = pgTable('parents', {
  parentId: serial('parent_id').primaryKey(),
  centerId: integer('center_id'),
  username: varchar('username', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  ...timestamps,
});

export const paymentPlans = pgTable('payment_plans', {
  planId: serial('plan_id').primaryKey(),
  centerId: integer('center_id'),
  studentId: integer('student_id'),
  totalAmount: numeric('total_amount'),
  status: varchar('status', { length: 50 }),
  ...timestamps,
});

export const payments = pgTable('payments', {
  paymentId: serial('payment_id').primaryKey(),
  studentId: integer('student_id'),
  centerId: integer('center_id'),
  paymentDate: date('payment_date'),
  amount: numeric('amount'),
  currency: varchar('currency', { length: 10 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  transactionReference: varchar('transaction_reference', { length: 255 }),
  receiptNumber: varchar('receipt_number', { length: 255 }),
  paymentStatus: varchar('payment_status', { length: 50 }),
  paymentType: varchar('payment_type', { length: 50 }),
  notes: text('notes'),
  discountId: integer('discount_id'),
  discountKind: varchar('discount_kind', { length: 40 }),
  discountValueType: varchar('discount_value_type', { length: 20 }),
  discountValue: numeric('discount_value'),
  originalAmount: numeric('original_amount'),
  discountAmount: numeric('discount_amount'),
  finalAmount: numeric('final_amount'),
  isComplete: boolean('is_complete'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
});

export const refunds = pgTable('refunds', {
  refundId: serial('refund_id').primaryKey(),
  paymentId: integer('payment_id'),
  amount: numeric('amount'),
  reason: text('reason'),
  status: varchar('status', { length: 50 }),
  refundedAt: timestamp('refunded_at'),
  ...timestamps,
});

export const rooms = pgTable('rooms', {
  roomId: serial('room_id').primaryKey(),
  centerId: integer('center_id'),
  roomNumber: varchar('room_number', { length: 50 }),
  classId: integer('class_id'),
  day: varchar('day', { length: 20 }),
  time: time('time'),
  endTime: time('end_time'),
  ...timestamps,
});

export const roomSlots = pgTable('room_slots', {
  slotId: serial('slot_id').primaryKey(),
  centerId: integer('center_id'),
  roomId: integer('room_id'),
  slotDate: date('slot_date'),
  startTime: time('start_time'),
  endTime: time('end_time'),
  durationMinutes: integer('duration_minutes'),
  isAvailable: boolean('is_available'),
  ...timestamps,
});

export const savedFilters = pgTable('saved_filters', {
  filterId: serial('filter_id').primaryKey(),
  centerId: integer('center_id'),
  userType: varchar('user_type', { length: 20 }),
  userId: integer('user_id'),
  name: varchar('name', { length: 100 }),
  entity: varchar('entity', { length: 50 }),
  filtersJson: jsonb('filters_json'),
  ...timestamps,
});

export const students = pgTable('students', {
  studentId: serial('student_id').primaryKey(),
  centerId: integer('center_id'),
  enrollmentNumber: varchar('enrollment_number', { length: 100 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  username: varchar('username', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  dateOfBirth: date('date_of_birth'),
  parentName: varchar('parent_name', { length: 255 }),
  parentPhone: varchar('parent_phone', { length: 50 }),
  gender: varchar('gender', { length: 20 }),
  status: varchar('status', { length: 50 }),
  teacherId: integer('teacher_id'),
  classId: integer('class_id'),
  previousClassId: integer('previous_class_id'),
  schoolName: varchar('school_name', { length: 255 }),
  schoolClass: varchar('school_class', { length: 50 }),
  isFrozen: boolean('is_frozen'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
});

export const subjects = pgTable('subjects', {
  subjectId: serial('subject_id').primaryKey(),
  centerId: integer('center_id'),
  classId: integer('class_id'),
  subjectName: varchar('subject_name', { length: 255 }),
  subjectCode: varchar('subject_code', { length: 100 }),
  teacherId: integer('teacher_id'),
  totalMarks: integer('total_marks'),
  passingMarks: integer('passing_marks'),
});

export const superusers = pgTable('superusers', {
  superuserId: serial('superuser_id').primaryKey(),
  centerId: integer('center_id'),
  username: varchar('username', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 50 }),
  permissions: jsonb('permissions'),
  ...timestamps,
});

export const teachers = pgTable('teachers', {
  teacherId: serial('teacher_id').primaryKey(),
  centerId: integer('center_id'),
  employeeId: varchar('employee_id', { length: 100 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  username: varchar('username', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  specialization: varchar('specialization', { length: 255 }),
  status: varchar('status', { length: 50 }),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
});

export const telegramRegistrations = pgTable('telegram_registrations', {
  registrationId: serial('registration_id').primaryKey(),
  centerId: integer('center_id'),
  telegramUserId: varchar('telegram_user_id', { length: 100 }),
  status: varchar('status', { length: 50 }),
  payload: jsonb('payload'),
  ...timestamps,
});

export const telegramStudents = pgTable('telegram_students', {
  telegramStudentId: serial('telegram_student_id').primaryKey(),
  studentId: integer('student_id'),
  telegramUserId: varchar('telegram_user_id', { length: 100 }),
  ...timestamps,
});

export const tests = pgTable('tests', {
  testId: serial('test_id').primaryKey(),
  centerId: integer('center_id'),
  teacherId: integer('teacher_id'),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  status: varchar('status', { length: 50 }),
  ...timestamps,
});

export const translations = pgTable('translations', {
  id: text('id').primaryKey(),
  english: text('english'),
  uzbek: text('uzbek'),
});

export const requestLogs = pgTable('request_logs', {
  logId: serial('log_id').primaryKey(),
  centerId: integer('center_id'),
  method: varchar('method', { length: 20 }),
  path: text('path'),
  statusCode: integer('status_code'),
  createdAt: timestamp('created_at'),
});

export const schemaTables = {
  app_settings: appSettings,
  assignments,
  attendance,
  audit_logs: auditLogs,
  edu_centers: centers,
  classes,
  class_sessions: classSessions,
  debts,
  discounts,
  grades,
  import_jobs: importJobs,
  invoices,
  notifications,
  owners,
  parents,
  payment_plans: paymentPlans,
  payments,
  refunds,
  rooms,
  room_slots: roomSlots,
  saved_filters: savedFilters,
  students,
  subjects,
  superusers,
  teachers,
  telegram_registrations: telegramRegistrations,
  telegram_students: telegramStudents,
  tests,
  translations,
  request_logs: requestLogs,
} as const;
