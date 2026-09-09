BEGIN;

CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    risk_level VARCHAR(10) NOT NULL,
    indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quarantine (
    email_id INTEGER PRIMARY KEY REFERENCES emails(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    quarantined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Isolate existing emails only when their latest analysis is malicious.
INSERT INTO quarantine (email_id, reason, indicators)
SELECT email_id, 'Correo clasificado como Malicious (riesgo alto).', indicators::jsonb
FROM (
    SELECT DISTINCT ON (email_id) email_id, risk_level, indicators
    FROM analysis_results
    ORDER BY email_id, created_at DESC, id DESC
) latest
WHERE risk_level = 'HIGH'
ON CONFLICT (email_id) DO NOTHING;

COMMIT;
