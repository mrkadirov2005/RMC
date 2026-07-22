const {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  varchar,
} = require('drizzle-orm/pg-core');

const appSettings = pgTable('app_settings', {
  settingId: serial('setting_id').primaryKey(),
  centerId: integer('center_id'),
  settingKey: varchar('setting_key', { length: 100 }).notNull(),
  settingValue: jsonb('setting_value').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

const translations = pgTable('translations', {
  id: text('id').primaryKey(),
  english: text('english').notNull(),
  uzbek: text('uzbek').notNull(),
});

const savedFilters = pgTable('saved_filters', {
  filterId: serial('filter_id').primaryKey(),
  centerId: integer('center_id'),
  userType: varchar('user_type', { length: 20 }).notNull(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 50 }).notNull(),
  filtersJson: jsonb('filters_json').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

const notifications = pgTable('notifications', {
  notificationId: serial('notification_id').primaryKey(),
  centerId: integer('center_id'),
  userType: varchar('user_type', { length: 20 }).notNull(),
  userId: integer('user_id').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 20 }),
  isRead: boolean('is_read'),
  createdAt: timestamp('created_at'),
});

const teacherPaymentCredentials = pgTable('teacher_payment_credentials', {
  teacherId: integer('teacher_id').primaryKey(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active'),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  lastUsedAt: timestamp('last_used_at'),
});

const rooms = pgTable('rooms', {
  roomId: serial('room_id').primaryKey(),
  centerId: integer('center_id').notNull(),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  classId: integer('class_id'),
  day: varchar('day', { length: 20 }),
  time: time('time'),
  endTime: time('end_time'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

const classes = pgTable('classes', {
  classId: serial('class_id').primaryKey(),
  centerId: integer('center_id').notNull(),
  className: varchar('class_name', { length: 100 }).notNull(),
  classCode: varchar('class_code', { length: 50 }).notNull(),
  level: integer('level'),
  section: text('section'),
  capacity: integer('capacity'),
  teacherId: integer('teacher_id'),
  roomNumber: varchar('room_number', { length: 50 }),
  totalStudents: integer('total_students'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

module.exports = {
  appSettings,
  translations,
  savedFilters,
  notifications,
  teacherPaymentCredentials,
  rooms,
  classes,
};

export {};
