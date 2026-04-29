-- CRM core schema (PostgreSQL). Table order respects foreign keys.
-- Replaces legacy general_db.sql with valid PostgreSQL syntax.

CREATE TYPE assignment_status AS ENUM ('Pending', 'Submitted', 'Graded');
CREATE TYPE class_status AS ENUM ('Active', 'Dropped', 'Graduated');
CREATE TYPE payment_frequency AS ENUM ('Monthly', 'Quarterly', 'Annual');
CREATE TYPE student_status AS ENUM ('Active', 'Inactive', 'Graduated', 'Removed');
CREATE TYPE student_gender AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE superuser_status AS ENUM ('Active', 'Inactive', 'Suspended');
CREATE TYPE owner_status AS ENUM ('Active', 'Inactive', 'Suspended');
CREATE TYPE teacher_status AS ENUM ('Active', 'Inactive', 'Retired');
CREATE TYPE teacher_gender AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Absent NR', 'Absent R', 'Late', 'Half Day');
CREATE TYPE payment_method_t AS ENUM ('Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Digital Wallet');

CREATE TABLE edu_centers (
    center_id SERIAL PRIMARY KEY,
    center_name VARCHAR(255) NOT NULL,
    center_code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    principal_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_center_code ON edu_centers(center_code);

CREATE TABLE teachers (
    teacher_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender teacher_gender,
    qualification VARCHAR(255),
    specialization VARCHAR(100),
    status teacher_status DEFAULT 'Active',
    roles JSONB,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_employee_id ON teachers(employee_id);
CREATE INDEX idx_teachers_status ON teachers(status);

CREATE TABLE superusers (
    superuser_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(100) DEFAULT 'Admin',
    permissions JSONB,
    status superuser_status DEFAULT 'Active',
    last_login TIMESTAMP,
    login_attempts INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_superuser_username ON superusers(username);
CREATE INDEX idx_superuser_status ON superusers(status);

CREATE TABLE owners (
    owner_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status owner_status DEFAULT 'Active',
    last_login TIMESTAMP,
    login_attempts INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_owner_username ON owners(username);
CREATE INDEX idx_owner_status ON owners(status);

CREATE TABLE classes (
    class_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(50) NOT NULL UNIQUE,
    level INT,
    section VARCHAR(50),
    capacity INT,
    teacher_id INT,
    room_number VARCHAR(50),
    total_students INT DEFAULT 0,
    payment_amount DECIMAL(12,2),
    payment_frequency payment_frequency DEFAULT 'Monthly',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

CREATE INDEX idx_class_code ON classes(class_code);
CREATE INDEX idx_classes_level ON classes(level);

CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    class_id INT NOT NULL,
    teacher_id INT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

CREATE UNIQUE INDEX ux_sessions_class_date_time ON sessions(class_id, session_date, start_time);
CREATE INDEX idx_sessions_class_id ON sessions(class_id);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_sessions_center_id ON sessions(center_id);

CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    parent_name VARCHAR(200),
    parent_phone VARCHAR(20),
    school_name VARCHAR(255),
    school_class VARCHAR(100),
    gender student_gender,
    status student_status DEFAULT 'Active',
    teacher_id INT,
    class_id INT,
    coins INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
);

CREATE INDEX idx_enrollment_number ON students(enrollment_number);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_teacher_id ON students(teacher_id);
CREATE INDEX idx_students_school_name ON students(school_name);

CREATE TABLE student_coin_transactions (
    transaction_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    center_id INT NOT NULL,
    delta INT NOT NULL,
    reason TEXT,
    created_by INT,
    created_by_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_student_coin_transactions_student_id ON student_coin_transactions(student_id);
CREATE INDEX idx_student_coin_transactions_center_id ON student_coin_transactions(center_id);

CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    class_id INT NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(50),
    teacher_id INT,
    total_marks INT DEFAULT 100,
    passing_marks INT DEFAULT 40,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    class_id INT,
    student_id INT,
    teacher_id INT,
    assignment_title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    submission_date DATE,
    grade DECIMAL(5,2),
    status assignment_status DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_student_id ON assignments(student_id);
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_status ON assignments(status);

CREATE TABLE assignment_submissions (
    submission_id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_date TIMESTAMP NOT NULL,
    file_path VARCHAR(500),
    grade DECIMAL(6,2),
    feedback TEXT,
    status VARCHAR(50) DEFAULT 'Submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_assignment_submission_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submission_student ON assignment_submissions(student_id);

CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    class_id INT NOT NULL,
    session_id INT,
    attendance_date DATE NOT NULL,
    status attendance_status DEFAULT 'Present',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE UNIQUE INDEX uniq_attendance_no_session
    ON attendance (student_id, class_id, attendance_date)
    WHERE session_id IS NULL;

CREATE UNIQUE INDEX uniq_attendance_session
    ON attendance (student_id, session_id)
    WHERE session_id IS NOT NULL;

CREATE INDEX idx_attendance_date ON attendance(attendance_date);

CREATE TABLE grades (
    grade_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    subject VARCHAR(100),
    class_id INT,
    session_id INT,
    marks_obtained DECIMAL(6,2),
    total_marks INT DEFAULT 100,
    percentage DECIMAL(5,2),
    grade_letter VARCHAR(5),
    attendance_score INT DEFAULT 0,
    homework_score INT DEFAULT 0,
    activity_score INT DEFAULT 0,
    academic_year INT,
    term VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE UNIQUE INDEX uniq_grade_session
    ON grades (student_id, session_id)
    WHERE session_id IS NOT NULL;

CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_academic_year ON grades(academic_year);

CREATE TABLE debts (
    debt_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    center_id INT NOT NULL,
    debt_amount DECIMAL(12,2) NOT NULL,
    debt_date DATE NOT NULL,
    due_date DATE,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_debt_date ON debts(debt_date);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    center_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method payment_method_t DEFAULT 'Cash',
    transaction_reference VARCHAR(100),
    receipt_number VARCHAR(50) UNIQUE,
    payment_status VARCHAR(50) DEFAULT 'Completed',
    payment_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_payment_date ON payments(payment_date);
CREATE INDEX idx_payment_status ON payments(payment_status);
CREATE INDEX idx_payments_student_id ON payments(student_id);
