/**
 * Restaura la base al estado inicial de una sesión de usabilidad (Sprint 3).
 *
 * El protocolo (`docs/protocolo-usabilidad.md`, sección 5) exige que los cinco
 * participantes vean exactamente lo mismo. Sin esto no se cumple: el primero
 * deja correos analizados y en cuarentena, y el segundo ya no encuentra la
 * bandeja limpia. Comparar sus tiempos dejaría de tener sentido.
 *
 * Hace falta además porque «Cargar dataset de prueba» inserta sin comprobar
 * duplicados (`backend/src/email/email.service.ts`): volver a pulsarlo entre
 * participantes añade una segunda copia en vez de reiniciar.
 *
 * `RESTART IDENTITY` es la parte que importa para el guion: devuelve la
 * secuencia a 1, así que los correos vuelven a ser los id 1 a 5 de la tabla de
 * la sección 5 del protocolo y el facilitador no tiene que buscarlos otra vez
 * en cada sesión.
 *
 * NO borra `users`: la cuenta con la que el facilitador deja la sesión abierta
 * sobrevive al reinicio.
 *
 *   PGPORT=5433 npm run usabilidad:reset -- --confirmar
 *
 * Sin `--confirmar` no hace nada. Borra datos y se ejecuta con el participante
 * esperando al lado; el error que no se puede permitir es correrlo contra la
 * base equivocada.
 *
 * `reiniciarBase` se exporta aparte de la parte de línea de comandos para que
 * la prueba de `test/reset-usabilidad.integration.mjs` ejecute el mismo SQL que
 * se ejecuta en la sesión, y no una copia que puede quedar desactualizada.
 */

import { createReadStream } from 'node:fs';
import csv from 'csv-parser';

const CSV = new URL('../../database/seeds/emails_dataset.csv', import.meta.url);

/** Lee el dataset con el mismo parser que usa la aplicación. */
export async function leerDataset(origen = CSV) {
  const correos = [];
  const flujo = createReadStream(origen).pipe(csv());
  for await (const correo of flujo) {
    if (!correo.sender || !correo.subject || !correo.content) continue;
    correos.push(correo);
  }
  return correos;
}

/**
 * Deja la base como al principio de una sesión. Recibe el cliente ya conectado
 * para poder correr tanto contra PostgreSQL como contra PGlite en las pruebas.
 *
 * Todo va en una transacción: si falla a mitad, la base queda como estaba y no
 * se arranca una sesión con media bandeja cargada.
 */
export async function reiniciarBase(client, correos) {
  if (!correos.length) {
    throw new Error('El dataset no tiene filas válidas; no se reinicia nada.');
  }

  await client.query('BEGIN');
  try {
    // `emails` arrastra en cascada analysis_results, quarantine y email_feedback.
    await client.query('TRUNCATE emails RESTART IDENTITY CASCADE');

    for (const correo of correos) {
      await client.query(
        `INSERT INTO emails (sender, recipient, subject, content, received_date, has_attachment)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          correo.sender,
          correo.recipient,
          correo.subject,
          correo.content,
          correo.received_date,
          correo.has_attachment === 'true',
        ],
      );
    }

    // La sensibilidad es global (US-06). Si el participante anterior la dejó en
    // estricta, el siguiente vería más correos en rojo sin haberla tocado.
    await client.query(
      `UPDATE configuracion
       SET sensibilidad = 'estandar', actualizada_en = CURRENT_TIMESTAMP
       WHERE id = 1`,
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }

  const { rows } = await client.query(
    'SELECT id, sender, subject FROM emails ORDER BY id',
  );
  return rows;
}

/** Solo se ejecuta cuando se invoca el archivo, no cuando se importa. */
async function principal() {
  const { Pool } = await import('pg');

  if (!process.argv.includes('--confirmar')) {
    console.error(
      'Esto BORRA correos, análisis, cuarentena y retroalimentación de la base ' +
        `«${process.env.PGDATABASE ?? 'mailwatch'}» en ` +
        `${process.env.PGHOST ?? 'localhost'}:${process.env.PGPORT ?? 5432}.\n` +
        'Si es la base de las pruebas de usabilidad, repite el comando con --confirmar.',
    );
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'mailwatch',
    password: process.env.PGPASSWORD ?? 'mailwatch',
    database: process.env.PGDATABASE ?? 'mailwatch',
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect().catch(async (error) => {
    console.error(
      'No se pudo conectar a PostgreSQL. Inicia Docker (`docker compose up -d`) y ' +
        'recuerda que el contenedor publica el puerto 5433, no el 5432.',
    );
    await pool.end();
    throw error;
  });

  try {
    const filas = await reiniciarBase(client, await leerDataset());

    console.log(`\nBase lista. ${filas.length} correos, sensibilidad estándar.\n`);
    for (const fila of filas) {
      console.log(`  id ${fila.id}  ${fila.sender}  «${fila.subject}»`);
    }
    console.log(
      '\nComprueba que coincide con la tabla de la sección 5 del protocolo.\n' +
        'Ningún correo está analizado todavía: la bandeja debe verse «Sin analizar».\n',
    );
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await principal();
}
