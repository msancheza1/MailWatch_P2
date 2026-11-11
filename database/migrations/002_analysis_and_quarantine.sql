BEGIN;

CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    risk_level VARCHAR(10) NOT NULL,
    indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF to_regclass('quarantine') IS NULL THEN
        CREATE TABLE quarantine (
            email_id INTEGER PRIMARY KEY REFERENCES emails(id) ON DELETE CASCADE,
            reason TEXT NOT NULL,
            indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
            quarantined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO quarantine (email_id, reason, indicators)
        SELECT
            email_id,
            'Correo clasificado como Malicious (riesgo alto).',
            indicators
        FROM (
            SELECT DISTINCT ON (email_id) email_id, risk_level, indicators
            FROM analysis_results
            ORDER BY email_id, created_at DESC, id DESC
        ) latest
        WHERE risk_level = 'HIGH';
    END IF;
END;
$$;

COMMIT;