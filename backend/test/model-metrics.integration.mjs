/**
 * CP-US10-01 — Visualizar métricas disponibles (issue #37, historia US-10 #12).
 *
 * La historia pide tres métricas para el administrador: precisión, errores y
 * cantidad de correos analizados. Esta suite las ejercita por la ruta real,
 * `GET /dashboard/model-metrics`, con el guardia de administrador puesto.
 * Solo se sustituye el transporte de base de datos (PGlite); el esquema son las
 * migraciones del repositorio y el SQL es el de `DashboardService`.
 *
 * El hallazgo H-01 (issue #57) se corrigió: la retroalimentación de US-08 ya
 * cuenta como revisión humana. Las pruebas del último bloque cubren esa
 * corrección y las dos fuentes de revisión que acepta la consulta:
 *
 * - `analysis_results.expected_risk_level`, explícita, que nadie escribe
 *   todavía y que manda sobre cualquier otra fuente.
 * - La valoración del usuario, que es la revisión que el producto sí recoge.
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

  // --- Revisión humana (H-01) ---------------------------------------------

  it('analizar un correo no lo deja revisado: hace falta que alguien opine', async () => {
    const id = await correo();
    await http.post('/analysis/' + id).set(comoAdmin).expect(201);

    const { rows } = await db.query(
      'SELECT expected_risk_level FROM analysis_results',
    );
    assert.equal(
      rows[0].expected_risk_level,
      null,
      'ninguna ruta escribe la columna explícita; la revisión se deriva',
    );

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(body.reviewedAnalyses, 0);
    assert.equal(body.precision, null, 'la interfaz lo muestra como «Sin datos»');
  });

  it('la corrección del usuario (US-08) cuenta como revisión y marca el error', async () => {
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
    assert.equal(body.reviewedAnalyses, 1, 'la valoración es una revisión humana');
    assert.equal(body.classificationErrors, 1, 'y el error del modelo ya se cuenta');
    assert.equal(body.precision, 0, 'la única predicción maliciosa revisada falló');
  });

  it('confirmar la clasificación cuenta como acierto, no como error', async () => {
    const id = await correo();
    await http.post('/analysis/' + id).set(comoAdmin).expect(201);

    const reporte = await http
      .post('/feedback/' + id)
      .set(comoAdmin)
      .send({ category: 'Malicious' })
      .expect(201);
    assert.equal(reporte.body.report_type, 'confirmation');

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(body.reviewedAnalyses, 1);
    assert.equal(body.classificationErrors, 0);
    assert.equal(body.precision, 100, 'estar de acuerdo también es evaluar');
  });

  it('cambiar de opinión reemplaza la revisión anterior', async () => {
    const id = await correo();
    await http.post('/analysis/' + id).set(comoAdmin).expect(201);

    await http.post('/feedback/' + id).set(comoAdmin).send({ category: 'Safe' }).expect(201);
    assert.equal((await metricas(comoAdmin)).body.classificationErrors, 1);

    await http.post('/feedback/' + id).set(comoAdmin).send({ category: 'Malicious' }).expect(201);

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(body.reviewedAnalyses, 1, 'sigue siendo un solo análisis revisado');
    assert.equal(body.classificationErrors, 0, 'manda la valoración más reciente');
    assert.equal(body.precision, 100);

    const { rows } = await db.query('SELECT count(*)::int AS n FROM email_feedback');
    assert.equal(rows[0].n, 2, 'y no se pierde el historial de valoraciones');
  });

  it('la revisión explícita manda sobre la valoración del usuario', async () => {
    const id = await correo();
    await analisisRevisado(id, 'HIGH', 'HIGH');
    const analisis = (
      await db.query('SELECT id FROM analysis_results WHERE email_id = $1', [id])
    ).rows[0];

    // Valoración que contradice la revisión explícita.
    await db.query(
      `INSERT INTO email_feedback (email_id, user_id, analysis_id, original_risk, category, report_type)
       VALUES ($1, 1, $2, 'HIGH', 'Safe', 'false_positive')`,
      [id, analisis.id],
    );

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(body.classificationErrors, 0, 'gana expected_risk_level');
    assert.equal(body.precision, 100);
  });

  it('la revisión no se arrastra a un análisis nuevo del mismo correo', async () => {
    const id = await correo();
    await http.post('/analysis/' + id).set(comoAdmin).expect(201);
    await http.post('/feedback/' + id).set(comoAdmin).send({ category: 'Safe' }).expect(201);
    assert.equal((await metricas(comoAdmin)).body.reviewedAnalyses, 1);

    // Reanalizar crea otro análisis, que nadie ha revisado todavía.
    await http.post('/analysis/' + id).set(comoAdmin).expect(201);

    const { body } = await metricas(comoAdmin).expect(200);
    assert.equal(body.reviewedAnalyses, 1, 'el análisis nuevo está sin revisar');
    assert.equal(body.emailsAnalyzed, 1, 'y sigue siendo un solo correo');
  });
});
