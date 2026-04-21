-- Fix database permissions for crm_user
-- Run this as a superuser (postgres)

-- Grant permissions on all tables
GRANT CONNECT ON DATABASE crm_db TO crm_user;
GRANT USAGE ON SCHEMA public TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_user;

-- Grant usage on sequences for auto-increment
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crm_user;

-- Grant permissions on specific tables explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON student_coin_transactions TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON grades TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON edu_centers TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON teachers TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO crm_user;

-- Make these default for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO crm_user;

-- Fix foreign key constraints to add CASCADE rules where needed
ALTER TABLE student_coin_transactions
  DROP CONSTRAINT IF EXISTS student_coin_transactions_student_id_fkey,
  ADD CONSTRAINT student_coin_transactions_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;

ALTER TABLE student_coin_transactions
  DROP CONSTRAINT IF EXISTS student_coin_transactions_center_id_fkey,
  ADD CONSTRAINT student_coin_transactions_center_id_fkey
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id) ON DELETE CASCADE;
