-- ============================================================================
-- Migration 016: Unified Audit Log
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Single polymorphic audit table replacing 4 separate history tables
-- Uses partitioning for efficient data retention

-- ============================================================================
-- AUDIT LOG (Partitioned by month)
-- ============================================================================

CREATE TABLE audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    -- What was changed
    entity_type audit_entity NOT NULL,
    entity_id UUID NOT NULL,

    -- Who made the change
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- What happened
    action audit_action NOT NULL,

    -- Change details (delta, not full snapshot)
    changes JSONB NOT NULL,

    -- Additional context
    metadata JSONB,

    -- When it happened
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Composite primary key for partitioning
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ============================================================================
-- INITIAL PARTITIONS (create monthly partitions)
-- ============================================================================

-- 2026 partitions
CREATE TABLE audit_log_2026_01 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_log_2026_02 PARTITION OF audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit_log_2026_03 PARTITION OF audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit_log_2026_04 PARTITION OF audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE audit_log_2026_05 PARTITION OF audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE audit_log_2026_06 PARTITION OF audit_log
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE audit_log_2026_08 PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE audit_log_2026_09 PARTITION OF audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE audit_log_2026_10 PARTITION OF audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE audit_log_2026_11 PARTITION OF audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE audit_log_2026_12 PARTITION OF audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Default partition for overflow (catches dates outside defined ranges)
CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT;

-- ============================================================================
-- INDEXES (created on parent, inherited by partitions)
-- ============================================================================

-- Lookup by entity
CREATE INDEX ix_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);

-- Lookup by actor
CREATE INDEX ix_audit_log_actor ON audit_log(actor_id, created_at DESC) WHERE actor_id IS NOT NULL;

-- Lookup by action
CREATE INDEX ix_audit_log_action ON audit_log(action, created_at DESC);

-- Time-based queries
CREATE INDEX ix_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- HELPER FUNCTION: Create future partitions
-- ============================================================================

CREATE OR REPLACE FUNCTION create_audit_log_partition(year INT, month INT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := format('audit_log_%s_%s', year, lpad(month::text, 2, '0'));
    start_date := make_date(year, month, 1);
    end_date := start_date + interval '1 month';

    -- Only create if doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = partition_name AND schemaname = 'public'
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Archive old partitions
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_audit_partitions(months_to_keep INT DEFAULT 12)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
BEGIN
    cutoff_date := date_trunc('month', now()) - (months_to_keep || ' months')::interval;

    FOR partition_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'audit_log_20%'
        AND tablename != 'audit_log_default'
        AND substring(tablename from 11 for 4)::int * 100 +
            substring(tablename from 16 for 2)::int <
            extract(year from cutoff_date)::int * 100 + extract(month from cutoff_date)::int
    LOOP
        -- Option 1: Detach partition (keeps data, removes from queries)
        -- EXECUTE format('ALTER TABLE audit_log DETACH PARTITION %I', partition_record.tablename);

        -- Option 2: Drop partition (deletes data)
        RAISE NOTICE 'Would archive partition: % (older than %)', partition_record.tablename, cutoff_date;
        -- EXECUTE format('DROP TABLE %I', partition_record.tablename);
    END LOOP;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_log IS 'Unified audit log for all entity changes, partitioned by month';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity changed: profile, lesson, assignment, song, song_progress';
COMMENT ON COLUMN audit_log.entity_id IS 'UUID of the entity that was changed';
COMMENT ON COLUMN audit_log.actor_id IS 'User who made the change (null for system changes)';
COMMENT ON COLUMN audit_log.action IS 'Type of action: created, updated, deleted, status_changed, etc.';
COMMENT ON COLUMN audit_log.changes IS 'JSON delta of changed fields (not full record)';
COMMENT ON COLUMN audit_log.metadata IS 'Additional context (source, IP, etc.)';
COMMENT ON FUNCTION create_audit_log_partition IS 'Creates a monthly partition for audit_log';
COMMENT ON FUNCTION archive_old_audit_partitions IS 'Archives partitions older than specified months';
