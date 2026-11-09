/**
 * Prueba del reinicio entre participantes (protocolo de usabilidad, sección 5).
 *
 * Importa `reiniciarBase` del script real en vez de repetir su SQL, para que la
 * prueba no se quede atrás si el script cambia. Solo se sustituye el transporte
 * de base de datos: el esquema son las migraciones del repositorio y el SQL es
 * el mismo que se ejecuta contra PostgreSQL.
 *
 * Lo que se comprueba es lo que haría fracasar una sesión: que la bandeja quede
 * limpia, que los id vuelvan a 1…5 —el guion nombra correos por id—, que la
 * sensibilidad vuelva a estándar y que el facilitador no pierda su cuenta.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import {
  leerDataset,
  reiniciarBase,
} from '../scripts/reset-usabilidad.mjs';

const MIGRACIONES = [
  '001_create_emails.sql',
  '002_analysis_and_quarantine.sql',
  '003_configuracion.sql',
  '003_auth.sql',
  '004_feedback.sql',
  '004_model_metrics.sql',
];

describe('reinicio de la base entre participantes', () => {
  let db, client, dataset;

  /** PGlite devuelve `affectedRows`; `pg` devuelve `rowCount`. */
  function clienteSobre(conexion) {
    return {
      async query(sql, params) {
        const resultado = await conexion.query(sql, params);
        return {
          rows: resultado.rows,
          rowCount: resultado.rows.length || resultado.affectedRows || 0,
        };
      },
    };
  }

  before(async () => {
    db = new PGlite();
    for (const archivo of MIGRACIONES) {
      const sql = await readFile(
        new URL('../../database/migrations/' + archivo, import.meta.url),
        'utf8',
      );
      await db.exec(sql);
    }
    client = clienteSobre(db);
    dataset = await leerDataset();

    // Estado en el que queda la base después de un participante: correos
    // cargados dos veces, uno analizado, en cuarentena y con una valoración.
    await db.exec(`
      INSERT INTO users (email, password_hash) VALUES ('facilitador@mailwatch.test', 'x');
      INSERT INTO emails (sender, recipient, subject, content, has_attachment)
      VALUES ('security@fakebank.com', 'user@mail.com', 'Verify account', 'Click here', false),
             ('security@fakebank.com', 'user@mail.com', 'Verify account', 'Click here', false);
      INSERT INTO analysis_results (email_id, risk_level, indicators)
      VALUES (1, 'HIGH', '["Keyword detected: verify"]'::jsonb);
      INSERT INTO quarantine (email_id, reason, indicators)
      VALUES (1, 'Correo clasificado como Malicious (riesgo alto).', '[]'::jsonb);
      INSERT INTO email_feedback (email_id, user_id, analysis_id, original_risk, category, report_type)
      VALUES (1, 1, 1, 'HIGH', 'Safe', 'false_positive');
      UPDATE configuracion SET sensibilidad = 'estricto' WHERE id = 1;
    `);
  });

  it('deja la bandeja con el dataset una sola vez y los id desde 1', async () => {
    const filas = await reiniciarBase(client, dataset);

    assert.equal(filas.length, dataset.length);
    assert.deepEqual(
      filas.map((fila) => fila.id),
      dataset.map((_, indice) => indice + 1),
      'el guion nombra los correos por id: la secuencia tiene que reiniciarse',
    );
    assert.equal(filas[0].sender, 'security@fakebank.com');
    assert.equal(filas[1].subject, 'Meeting tomorrow');
  });

  it('borra análisis, cuarentena y retroalimentación del participante anterior', async () => {
    await reiniciarBase(client, dataset);

    for (const tabla of ['analysis_results', 'quarantine', 'email_feedback']) {
      const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${tabla}`);
      assert.equal(rows[0].n, 0, `${tabla} debería quedar vacía`);
    }
  });

  it('devuelve la sensibilidad a estándar', async () => {
    await client.query(
      `UPDATE configuracion SET sensibilidad = 'estricto' WHERE id = 1`,
    );

    await reiniciarBase(client, dataset);

    const { rows } = await client.query(
      'SELECT sensibilidad FROM configuracion WHERE id = 1',
    );
    assert.equal(rows[0].sensibilidad, 'estandar');
  });

  it('conserva la cuenta con la que el facilitador tiene la sesión abierta', async () => {
    await reiniciarBase(client, dataset);

    const { rows } = await client.query('SELECT email FROM users');
    assert.deepEqual(
      rows.map((fila) => fila.email),
      ['facilitador@mailwatch.test'],
    );
  });

  it('no toca la base si el dataset viene vacío', async () => {
    await reiniciarBase(client, dataset);

    await assert.rejects(() => reiniciarBase(client, []), /no tiene filas/);

    const { rows } = await client.query('SELECT count(*)::int AS n FROM emails');
    assert.equal(rows[0].n, dataset.length);
  });
});
