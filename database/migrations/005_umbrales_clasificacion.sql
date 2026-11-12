BEGIN;

ALTER TABLE configuracion
    ADD COLUMN IF NOT EXISTS medio_estandar INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS alto_estandar INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS medio_estricto INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS alto_estricto INTEGER NOT NULL DEFAULT 2;

ALTER TABLE configuracion
    DROP CONSTRAINT IF EXISTS configuracion_umbrales_validos,
    ADD CONSTRAINT configuracion_umbrales_validos CHECK (
        medio_estandar >= 1 AND medio_estandar < alto_estandar
        AND medio_estricto >= 1 AND medio_estricto < alto_estricto
        AND medio_estricto <= medio_estandar AND alto_estricto <= alto_estandar
    );

COMMIT;
