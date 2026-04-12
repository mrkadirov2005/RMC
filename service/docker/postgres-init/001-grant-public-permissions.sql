-- Ensure the application user owns the default schema and can run migrations.
ALTER DATABASE crm_db OWNER TO crm_user;
ALTER SCHEMA public OWNER TO crm_user;
GRANT ALL ON SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;
