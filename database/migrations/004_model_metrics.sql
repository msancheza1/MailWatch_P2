BEGIN;

-- Permite distinguir al administrador de los demás usuarios.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Clasificación verificada por una persona.
-- NULL significa que el análisis todavía no se ha revisado.
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS expected_risk_level VARCHAR(10)
CHECK (expected_risk_level IN ('LOW', 'MEDIUM', 'HIGH'));

COMMIT;