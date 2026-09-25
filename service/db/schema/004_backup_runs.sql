CREATE TABLE IF NOT EXISTS backup_runs (
    run_id VARCHAR(100) PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,
    trigger_source VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_runs_started_at ON backup_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_runs_status ON backup_runs(status);
