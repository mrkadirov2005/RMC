-- Fix database permissions for crm_user
-- Run this as a superuser (postgres)

-- Grant permissions on student_coin_transactions table
GRANT SELECT, INSERT, UPDATE, DELETE ON student_coin_transactions TO crm_user;

-- Grant permissions on related tables if needed
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON grades TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO crm_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO crm_user;

-- Grant usage on sequences for auto-increment
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crm_user;

-- Make these default for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO crm_user;
