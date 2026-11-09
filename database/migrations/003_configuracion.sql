BEGIN;

-- Configuración del análisis (US-06). Una sola fila: todavía no hay usuarios,
-- así que la preferencia es del sistema. Cuando exista la tabla de usuarios
-- esto pasa a ser una fila por usuario con su clave foránea.
CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    sensibilidad VARCHAR(10) NOT NULL DEFAULT 'estandar'
        CHECK (sensibilidad IN ('estandar', 'estricto')),
    actualizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- La restricción CHECK de `id` impide que se cuele una segunda fila, para que
-- nunca haya dudas sobre cuál es la configuración vigente.
INSERT INTO configuracion (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
