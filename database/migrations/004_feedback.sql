BEGIN;
CREATE TABLE IF NOT EXISTS email_feedback (
    id SERIAL PRIMARY KEY,
    email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    analysis_id INTEGER NOT NULL REFERENCES analysis_results(id),
    original_risk VARCHAR(10) NOT NULL CHECK (original_risk IN ('LOW', 'MEDIUM', 'HIGH')),
    category VARCHAR(10) NOT NULL CHECK (category IN ('Safe', 'Malicious')),
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('false_positive', 'false_negative', 'confirmation')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS email_feedback_user_email_idx
    ON email_feedback (user_id, email_id, id DESC);
COMMIT;
