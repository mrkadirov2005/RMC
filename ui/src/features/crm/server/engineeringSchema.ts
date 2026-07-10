export type SchemaColumn = {
  name: string;
  type: string;
  role?: 'pk' | 'fk' | 'enum' | 'unique' | 'json';
};

export type SchemaReference = {
  column: string;
  targetTable: string;
  targetColumn: string;
  onDelete?: string;
};

export type SchemaTable = {
  table: string;
  domain: string;
  purpose: string;
  columns: SchemaColumn[];
  references?: SchemaReference[];
};

export const schemaTables: SchemaTable[] = [
  {
    table: 'edu_centers',
    domain: 'Tenant Core',
    purpose: 'Root tenant record for all center-scoped data.',
    columns: [
      { name: 'center_id', type: 'serial', role: 'pk' },
      { name: 'name', type: 'varchar' },
      { name: 'address', type: 'text' },
      { name: 'phone', type: 'varchar' },
      { name: 'email', type: 'varchar' },
      { name: 'created_at', type: 'timestamp' },
    ],
  },
  {
    table: 'teachers',
    domain: 'People',
    purpose: 'Teacher accounts, staff ids, credentials, and salary percentage.',
    columns: [
      { name: 'teacher_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'employee_id', type: 'varchar', role: 'unique' },
      { name: 'first_name', type: 'varchar' },
      { name: 'last_name', type: 'varchar' },
      { name: 'username', type: 'varchar', role: 'unique' },
      { name: 'salary_percentage', type: 'numeric' },
      { name: 'status', type: 'teacher_status', role: 'enum' },
    ],
    references: [{ column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' }],
  },
  {
    table: 'classes',
    domain: 'Academic',
    purpose: 'Groups/classes owned by teachers.',
    columns: [
      { name: 'class_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'teacher_id', type: 'integer', role: 'fk' },
      { name: 'class_name', type: 'varchar' },
      { name: 'class_code', type: 'varchar', role: 'unique' },
      { name: 'payment_amount', type: 'numeric' },
      { name: 'payment_frequency', type: 'payment_frequency', role: 'enum' },
    ],
    references: [
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
      { column: 'teacher_id', targetTable: 'teachers', targetColumn: 'teacher_id' },
    ],
  },
  {
    table: 'students',
    domain: 'People',
    purpose: 'Student accounts, school metadata, class assignment, and direct teacher fallback.',
    columns: [
      { name: 'student_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'teacher_id', type: 'integer', role: 'fk' },
      { name: 'class_id', type: 'integer', role: 'fk' },
      { name: 'enrollment_number', type: 'varchar', role: 'unique' },
      { name: 'first_name', type: 'varchar' },
      { name: 'last_name', type: 'varchar' },
      { name: 'username', type: 'varchar', role: 'unique' },
      { name: 'school_name', type: 'varchar' },
      { name: 'school_class', type: 'varchar' },
    ],
    references: [
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
      { column: 'teacher_id', targetTable: 'teachers', targetColumn: 'teacher_id' },
      { column: 'class_id', targetTable: 'classes', targetColumn: 'class_id' },
    ],
  },
  {
    table: 'sessions',
    domain: 'Academic',
    purpose: 'Scheduled class sessions.',
    columns: [
      { name: 'session_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'class_id', type: 'integer', role: 'fk' },
      { name: 'teacher_id', type: 'integer', role: 'fk' },
      { name: 'session_date', type: 'date' },
      { name: 'start_time', type: 'time' },
      { name: 'duration_minutes', type: 'integer' },
    ],
    references: [
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
      { column: 'class_id', targetTable: 'classes', targetColumn: 'class_id', onDelete: 'CASCADE' },
      { column: 'teacher_id', targetTable: 'teachers', targetColumn: 'teacher_id' },
    ],
  },
  {
    table: 'subjects',
    domain: 'Academic',
    purpose: 'Class subject setup and grading bounds.',
    columns: [
      { name: 'subject_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'class_id', type: 'integer', role: 'fk' },
      { name: 'teacher_id', type: 'integer', role: 'fk' },
      { name: 'subject_name', type: 'varchar' },
      { name: 'subject_code', type: 'varchar' },
      { name: 'total_marks', type: 'integer' },
    ],
    references: [
      { column: 'class_id', targetTable: 'classes', targetColumn: 'class_id', onDelete: 'CASCADE' },
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
      { column: 'teacher_id', targetTable: 'teachers', targetColumn: 'teacher_id' },
    ],
  },
  {
    table: 'attendance',
    domain: 'Academic',
    purpose: 'Student attendance by class/session.',
    columns: [
      { name: 'attendance_id', type: 'serial', role: 'pk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'teacher_id', type: 'integer', role: 'fk' },
      { name: 'class_id', type: 'integer', role: 'fk' },
      { name: 'session_id', type: 'integer', role: 'fk' },
      { name: 'attendance_date', type: 'date' },
      { name: 'status', type: 'attendance_status', role: 'enum' },
    ],
    references: [
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id' },
      { column: 'teacher_id', targetTable: 'teachers', targetColumn: 'teacher_id' },
      { column: 'class_id', targetTable: 'classes', targetColumn: 'class_id' },
      { column: 'session_id', targetTable: 'sessions', targetColumn: 'session_id' },
    ],
  },
  {
    table: 'grades',
    domain: 'Academic',
    purpose: 'Marks and grade summaries.',
    columns: [
      { name: 'grade_id', type: 'serial', role: 'pk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'teacher_id', type: 'integer', role: 'fk' },
      { name: 'session_id', type: 'integer', role: 'fk' },
      { name: 'marks_obtained', type: 'numeric' },
      { name: 'total_marks', type: 'numeric' },
      { name: 'percentage', type: 'numeric' },
    ],
    references: [
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id' },
      { column: 'teacher_id', targetTable: 'teachers', targetColumn: 'teacher_id' },
      { column: 'session_id', targetTable: 'sessions', targetColumn: 'session_id' },
    ],
  },
  {
    table: 'payments',
    domain: 'Finance',
    purpose: 'Tuition payments and payment snapshots.',
    columns: [
      { name: 'payment_id', type: 'serial', role: 'pk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'payment_date', type: 'date' },
      { name: 'amount', type: 'numeric' },
      { name: 'payment_method', type: 'payment_method_t', role: 'enum' },
      { name: 'receipt_number', type: 'varchar', role: 'unique' },
      { name: 'is_complete', type: 'boolean' },
    ],
    references: [
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id' },
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
    ],
  },
  {
    table: 'debts',
    domain: 'Finance',
    purpose: 'Outstanding student balances.',
    columns: [
      { name: 'debt_id', type: 'serial', role: 'pk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'amount', type: 'numeric' },
      { name: 'due_date', type: 'date' },
      { name: 'status', type: 'varchar' },
    ],
    references: [
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id' },
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
    ],
  },
  {
    table: 'discounts',
    domain: 'Finance',
    purpose: 'Serial and monthly discount records.',
    columns: [
      { name: 'discount_id', type: 'serial', role: 'pk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'discount_type', type: 'varchar' },
      { name: 'discount_kind', type: 'discount_kind', role: 'enum' },
      { name: 'value_type', type: 'discount_type', role: 'enum' },
      { name: 'value', type: 'numeric' },
    ],
    references: [
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id' },
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
    ],
  },
  {
    table: 'invoices',
    domain: 'Finance',
    purpose: 'Invoice header records.',
    columns: [
      { name: 'invoice_id', type: 'serial', role: 'pk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'invoice_number', type: 'varchar', role: 'unique' },
      { name: 'total_amount', type: 'numeric' },
      { name: 'status', type: 'invoice_status', role: 'enum' },
    ],
    references: [
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id' },
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
    ],
  },
  {
    table: 'parents',
    domain: 'People',
    purpose: 'Parent accounts.',
    columns: [
      { name: 'parent_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'first_name', type: 'varchar' },
      { name: 'last_name', type: 'varchar' },
      { name: 'username', type: 'varchar', role: 'unique' },
      { name: 'status', type: 'parent_status', role: 'enum' },
    ],
    references: [{ column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' }],
  },
  {
    table: 'parent_students',
    domain: 'People',
    purpose: 'Many-to-many parent/student ownership.',
    columns: [
      { name: 'parent_student_id', type: 'serial', role: 'pk' },
      { name: 'parent_id', type: 'integer', role: 'fk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'relationship', type: 'varchar' },
      { name: 'is_primary', type: 'boolean' },
    ],
    references: [
      { column: 'parent_id', targetTable: 'parents', targetColumn: 'parent_id', onDelete: 'CASCADE' },
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id', onDelete: 'CASCADE' },
    ],
  },
  {
    table: 'tests',
    domain: 'Testing',
    purpose: 'Test configuration and assignment defaults.',
    columns: [
      { name: 'test_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'subject_id', type: 'integer', role: 'fk' },
      { name: 'test_name', type: 'varchar' },
      { name: 'test_type', type: 'test_type', role: 'enum' },
      { name: 'test_data', type: 'jsonb', role: 'json' },
    ],
    references: [
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id', onDelete: 'CASCADE' },
      { column: 'subject_id', targetTable: 'subjects', targetColumn: 'subject_id', onDelete: 'SET NULL' },
    ],
  },
  {
    table: 'test_questions',
    domain: 'Testing',
    purpose: 'Questions for tests and reading passages.',
    columns: [
      { name: 'question_id', type: 'serial', role: 'pk' },
      { name: 'test_id', type: 'integer', role: 'fk' },
      { name: 'passage_id', type: 'integer', role: 'fk' },
      { name: 'question_text', type: 'text' },
      { name: 'options', type: 'jsonb', role: 'json' },
      { name: 'marks', type: 'integer' },
    ],
    references: [
      { column: 'test_id', targetTable: 'tests', targetColumn: 'test_id', onDelete: 'CASCADE' },
      { column: 'passage_id', targetTable: 'reading_passages', targetColumn: 'passage_id', onDelete: 'SET NULL' },
    ],
  },
  {
    table: 'test_submissions',
    domain: 'Testing',
    purpose: 'Student test attempts.',
    columns: [
      { name: 'submission_id', type: 'serial', role: 'pk' },
      { name: 'test_id', type: 'integer', role: 'fk' },
      { name: 'student_id', type: 'integer', role: 'fk' },
      { name: 'answers_data', type: 'jsonb', role: 'json' },
      { name: 'score', type: 'numeric' },
      { name: 'status', type: 'test_submission_status', role: 'enum' },
    ],
    references: [
      { column: 'test_id', targetTable: 'tests', targetColumn: 'test_id', onDelete: 'CASCADE' },
      { column: 'student_id', targetTable: 'students', targetColumn: 'student_id', onDelete: 'CASCADE' },
    ],
  },
  {
    table: 'rooms',
    domain: 'Resources',
    purpose: 'Physical room inventory.',
    columns: [
      { name: 'room_id', type: 'serial', role: 'pk' },
      { name: 'center_id', type: 'integer', role: 'fk' },
      { name: 'class_id', type: 'integer', role: 'fk' },
      { name: 'room_number', type: 'varchar' },
      { name: 'capacity', type: 'integer' },
      { name: 'status', type: 'varchar' },
    ],
    references: [
      { column: 'center_id', targetTable: 'edu_centers', targetColumn: 'center_id' },
      { column: 'class_id', targetTable: 'classes', targetColumn: 'class_id', onDelete: 'SET NULL' },
    ],
  },
  {
    table: 'audit_logs',
    domain: 'System',
    purpose: 'Actor/action/entity audit trail.',
    columns: [
      { name: 'audit_id', type: 'serial', role: 'pk' },
      { name: 'user_type', type: 'varchar' },
      { name: 'user_id', type: 'integer' },
      { name: 'action', type: 'varchar' },
      { name: 'entity', type: 'varchar' },
      { name: 'metadata', type: 'jsonb', role: 'json' },
    ],
  },
  {
    table: 'saved_filters',
    domain: 'System',
    purpose: 'User saved grid filters.',
    columns: [
      { name: 'filter_id', type: 'serial', role: 'pk' },
      { name: 'user_type', type: 'varchar' },
      { name: 'user_id', type: 'integer' },
      { name: 'entity', type: 'varchar' },
      { name: 'filters_json', type: 'jsonb', role: 'json' },
    ],
  },
];

export const schemaDomains = Array.from(new Set(schemaTables.map((table) => table.domain)));
