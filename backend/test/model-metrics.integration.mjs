/**
 * CP-US10-01 — Visualizar métricas disponibles (issue #37, historia US-10 #12).
 *
 * La historia pide tres métricas para el administrador: precisión, errores y
 * cantidad de correos analizados. Esta suite las ejercita por la ruta real,
 * `GET /dashboard/model-metrics`, con el guardia de administrador puesto.
 * Solo se sustituye el transporte de base de datos (PGlite); el esquema son las
 * migraciones del repositorio y el SQL es el de `DashboardService`.
 *
 * Dos de las pruebas documentan límites de la entrega, no aciertos. Están
 * escritas para fallar el día en que se arreglen, que es cuando hay que volver
 * a leerlas:
 *
 * - `expected_risk_level` no lo escribe ninguna parte de la aplicación, así que
 *   en una instalación real la precisión siempre dice «Sin datos» y los errores
 *   siempre son 0.
 * - La retroalimentación de US-08 —la corrección que hace el usuario— se guarda
 *   en otra tabla y no alimenta estas métricas.
 */

import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { DatabaseService } from '../dist/database/database.service.js';
import { tokenHash } from '../dist/auth/auth.service.js';

const MIGRACIONES = [
  '001_create_emails.sql',
  '002_analysis_and_quarantine.sql',
  '003_configuracion.sql',
  '003_auth.sql',
  '004_feedback.sql',
  '004_model_metrics.sql',
];

describe('CP-US10-01 — métricas del modelo', () => {
  let db, app, http;
  const tokenAdmin = 'a'.repeat(64);
  const tokenUsuario = 'b'.repeat(64);
  const comoAdmin = { Authorization: 'Bearer ' + tokenAdmin };
  const comoUsuario = { Authorization: 'Bearer ' + tokenUsuario };

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

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({
        ...clienteSobre(db),
        transaction: (trabajo) => db.transaction((tx) => trabajo(clienteSobre(tx))),
      })
      .compile();

    app = modulo.createNestApplication({ logger: false });
    await app.init();
    http = request(app.getHttpServer());
  });

  beforeEach(async () => {
    await db.exec(`
      TRUNCATE emails, analysis_results, quarantine, email_feedback, users, sessions
        RESTART IDENTITY CASCADE;
      INSERT INTO users (email, password_hash, is_admin) VALUES
        ('admin@mailwatch.test', 'unused', TRUE),
        ('persona@mailwatch.test', 'unused', FALSE);
    `);
    for (const [idUsuario, token] of [
      [1, tokenAdmin],
      [2, tokenUsuario],
    ]) {
      await db.query(
        "INSERT INTO sessions VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
        [tokenHash(token), idUsuario],
      );
    }
  });

  after(async () => {
    await app?.close();
    await db?.close();
  });

  /** Crea un correo y devuelve su id. */
  async function correo(asunto = 'Verify account', contenido = 'Reset your password immediately') {
    const { rows } = await db.query(
      `INSERT INTO emails (sender, subject, content)
       VALUES ('security@fakebank.com', $1, $2) RETURNING id`,
      [asunto, contenido],
    );
    return rows[0].id;
  }

  /** Guarda un análisis ya revisado por una persona, que es lo que mide la historia. */
  async function analisisRevisado(idCorreo, riesgo, esperado) {
    await db.query(
      `INSERT INTO analysis_results (email_id, risk_level, indicators, expected_risk_level)
       VALUES ($1, $2, '[]'::jsonb, $3)`,
      [idCorreo, riesgo, esperado],
    );
  }

  function metricas(cabeceras) {
    return http.get('/dashboard/model-metrics').set(cabeceras);
  }

  // --- Acceso -------------------------------------------------------------

  it('el administrador ve las métricas', async () => {
    const { body } = await metricas(comoAdmin).expect(200);

    assert.deepEqual(Object.keys(body).sort(), [
      'classificationErrors',
      'emailsAnalyzed',
      'precision',
      'reviewedAnalyses',
    ]);
  });

  it('una cuenta sin permisos de administrador recibe 403', async () => {
    // La interfaz oculta el panel completo ante un 403 (`ModelMetrics.tsx`),
    // así que este código es también el que decide que no se vea la sección.
    await metricas(comoUsuario).expect(403);
  });

  it('sin sesión no se entregan métricas', async () => {
    await http.get('/dashboard/model-metrics').expect(401);
  });

  // --- Cantidad de correos analizados -------------------------------------

  it('«correos analizados» cuenta correos distintos, no análisis', async () => {
    const id = await correo();

    await http.post('/analysis/' + id).set(comoAdmin).expect(201);
    await http.post('/analysis/' + id).set(comoAdmin).expect(201);

    const { rows } = await db.query('SELECT count(*)::int AS n FROM analysis_results');
    assert.equal(rows[0].n, 2, 'el correo se analizó dos veces');

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(body.emailsAnalyzed, 1, 'pero es un solo correo analizado');
  });

  it('en una base vacía las tres métricas salen en cero o sin datos', async () => {
    const { body } = await metricas(comoAdmin).expect(200);

    assert.equal(body.emailsAnalyzed, 0);
    assert.equal(body.reviewedAnalyses, 0);
    assert.equal(body.classificationErrors, 0);
    assert.equal(body.precision, null, 'la interfaz lo muestra como «Sin datos»');
  });

  // --- Precisión y errores ------------------------------------------------

  it('la precisión es la de la clase maliciosa sobre lo revisado', async () => {
    // Tres predicciones «malicioso» revisadas: dos aciertos y un falso positivo.
    await analisisRevisado(await correo(), 'HIGH', 'HIGH');
    await analisisRevisado(await correo(), 'HIGH', 'HIGH');
    await analisisRevisado(await correo(), 'HIGH', 'LOW');
    // Una predicción «sospechoso» equivocada: cuenta como error, no en la precisión.
    await analisisRevisado(await correo(), 'MEDIUM', 'LOW');

    const { body } = await metricas(comoAdmin).expect(200);

    assert.equal(body.precision, 66.67, '2 aciertos de 3 predicciones maliciosas');
    assert.equal(body.classificationErrors, 2, 'el falso positivo y el sospechoso');
    assert.equal(body.reviewedAnalyses, 4);
    assert.equal(body.emailsAnalyzed, 4);
  });

  it('los análisis sin revisar no cuentan ni como acierto ni como error', async () => {
    await analisisRevisado(await correo(), 'HIGH', 'HIGH');
    // Sin `expected_risk_level`: nadie lo ha verificado todavía.
    await db.query(
      `INSERT INTO analysis_results (email_id, risk_level, indicators)
       VALUES ($1, 'HIGH', '[]'::jsonb)`,
      [await correo()],
    );

    const { body } = await metricas(comoAdmin).expect(200);

    assert.equal(body.precision, 100, 'solo se evalúa el análisis revisado');
    assert.equal(body.reviewedAnalyses, 1);
    assert.equal(body.classificationErrors, 0);
    assert.equal(body.emailsAnalyzed, 2, 'pero los dos correos sí están analizados');
  });

  // --- Límites de la entrega ----------------------------------------------

  it('LÍMITE: analizar por la aplicación nunca deja un análisis revisado', async () => {
    const id = await correo();
    await http.post('/analysis/' + id).set(comoAdmin).expect(201);

    const { rows } = await db.query(
      'SELECT expected_risk_level FROM analysis_results',
    );
    assert.equal(
      rows[0].expected_risk_level,
      null,
      'ninguna ruta de la aplicación escribe expected_risk_level',
    );

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(body.precision, null);
    assert.equal(body.classificationErrors, 0);
  });

  it('LÍMITE: la corrección del usuario (US-08) no mueve las métricas', async () => {
    const id = await correo();
    const analisis = (await http.post('/analysis/' + id).set(comoAdmin).expect(201)).body;
    assert.equal(analisis.category, 'Malicious');

    // El usuario dice que el sistema se equivocó: es un falso positivo.
    const reporte = await http
      .post('/feedback/' + id)
      .set(comoAdmin)
      .send({ category: 'Safe' })
      .expect(201);
    assert.equal(reporte.body.report_type, 'false_positive');

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(
      body.classificationErrors,
      0,
      'el error que reportó la persona no aparece como error del modelo',
    );
    assert.equal(body.precision, null, 'y la precisión sigue sin datos');
  });
});
