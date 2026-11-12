import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { AnalysisService } from '../dist/analysis/analysis.service.js';
import { tokenHash } from '../dist/auth/auth.service.js';
import { DatabaseService } from '../dist/database/database.service.js';

const endpoint = '/configuracion/umbrales';
const migracion = '005_umbrales_clasificacion.sql';
const defaults = {
  estandar: { medio: 1, alto: 3 },
  estricto: { medio: 1, alto: 2 },
};
const nuevos = {
  estandar: { medio: 2, alto: 4 },
  estricto: { medio: 1, alto: 3 },
};
const tokenAdmin = 'a'.repeat(64);
const tokenUsuario = 'b'.repeat(64);
const admin = { Authorization: 'Bearer ' + tokenAdmin };
const usuario = { Authorization: 'Bearer ' + tokenUsuario };

describe('US-11 — configuración de umbrales de clasificación', () => {
  let db, app, http;

  async function aplicar(archivo) {
    await db.exec(
      await readFile(
        new URL('../../database/migrations/' + archivo, import.meta.url),
        'utf8',
      ),
    );
  }

  function cliente(conexion) {
    return {
      async query(sql, params) {
        const result = await conexion.query(sql, params);
        return {
          rows: result.rows,
          rowCount: result.rows.length || result.affectedRows || 0,
        };
      },
    };
  }

  before(async () => {
    db = new PGlite();
    for (const archivo of [
      '001_create_emails.sql',
      '002_analysis_and_quarantine.sql',
      '003_auth.sql',
      '003_configuracion.sql',
      '004_model_metrics.sql',
    ]) {
      await aplicar(archivo);
    }
    await db.exec("UPDATE configuracion SET sensibilidad = 'estricto'");

    await db.exec(`
      INSERT INTO users (email, password_hash, is_admin) VALUES
        ('admin@mailwatch.test', 'unused', TRUE),
        ('usuario@mailwatch.test', 'unused', FALSE);
      INSERT INTO emails (sender, subject, content) VALUES
        ('persona@example.com', 'Urgent meeting', 'Review the document.'),
        ('persona@example.com', 'Urgent account reminder', 'Verify details.');
    `);
    for (const [id, token] of [
      [1, tokenAdmin],
      [2, tokenUsuario],
    ]) {
      await db.query(
        "INSERT INTO sessions VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
        [tokenHash(token), id],
      );
    }

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({
        ...cliente(db),
        transaction: (trabajo) => db.transaction((tx) => trabajo(cliente(tx))),
      })
      .compile();
    app = modulo.createNestApplication({ logger: false });
    await app.init();
    http = request(app.getHttpServer());
  });

  after(async () => {
    await app?.close();
    await db?.close();
  });

  it('analiza con los valores iniciales antes de migrar una base existente', async () => {
    const { body } = await http.post('/analysis/1').set(usuario).expect(201);
    assert.equal(body.sensibilidad, 'estricto');
    assert.equal(body.risk, 'MEDIUM');
    assert.equal(body.status, 'available');
    await http.get(endpoint).set(admin).expect(200, defaults);
    const respuesta = await http
      .put(endpoint)
      .set(admin)
      .send(nuevos)
      .expect(503);
    assert.match(respuesta.body.message, /migración/);
  });

  describe('con la migración aplicada', () => {
    before(() => aplicar(migracion));

    it('protege la consulta y la edición para administradores', async () => {
      await http.get(endpoint).expect(401);
      await http.put(endpoint).send(nuevos).expect(401);
      await http.get(endpoint).set(usuario).expect(403);
      await http.put(endpoint).set(usuario).send(nuevos).expect(403);
      await http.get(endpoint).set(admin).expect(200, defaults);
    });

    it('rechaza valores inválidos y conserva los límites guardados', async () => {
      for (const estandar of [
        { medio: 0, alto: 3 },
        { medio: 1.5, alto: 3 },
        { medio: '1', alto: 3 },
        { medio: 1, alto: 2_147_483_648 },
        { medio: 3, alto: 3 },
        { medio: 1, alto: 2 },
        {},
      ]) {
        await http
          .put(endpoint)
          .set(admin)
          .send({ ...nuevos, estandar })
          .expect(400);
      }
      await http.get(endpoint).set(admin).expect(200, defaults);
    });

    it('CP-US11-01 guarda los cambios y los aplica al siguiente análisis', async () => {
      const sensibilidad = () => http.get('/configuracion').set(usuario);
      const cambiarSensibilidad = (valor) =>
        http.put('/configuracion').set(usuario).send({ sensibilidad: valor });
      const analizar = (id) => http.post('/analysis/' + id).set(usuario);

      assert.equal(
        (await sensibilidad().expect(200)).body.sensibilidad,
        'estricto',
      );
      await cambiarSensibilidad('estandar').expect(200);
      assert.equal((await analizar(1).expect(201)).body.risk, 'MEDIUM');
      assert.equal((await analizar(2).expect(201)).body.risk, 'HIGH');

      await http.put(endpoint).set(admin).send(nuevos).expect(200, nuevos);
      await aplicar(migracion);
      await http.get(endpoint).set(admin).expect(200, nuevos);
      assert.equal(
        (await sensibilidad().expect(200)).body.sensibilidad,
        'estandar',
      );
      assert.equal((await analizar(1).expect(201)).body.risk, 'LOW');
      const analisis = (await analizar(2).expect(201)).body;
      assert.equal(analisis.risk, 'MEDIUM');
      assert.equal(analisis.status, 'available');

      await cambiarSensibilidad('estricto').expect(200);
      await http.get(endpoint).set(admin).expect(200, nuevos);
      const estricto = (await analizar(2).expect(201)).body;
      assert.equal(estricto.risk, 'HIGH');
      assert.equal(estricto.status, 'quarantined');
      assert.equal(
        (
          await app.get(AnalysisService).evaluateContent({
            sender: 'persona@example.com',
            subject: 'Urgent account reminder',
            content: 'Verify details.',
          })
        ).riskLevel,
        'HIGH',
      );
      const historial = await db.query(
        'SELECT risk_level FROM analysis_results WHERE email_id = 2 ORDER BY id',
      );
      assert.deepEqual(
        historial.rows.map(({ risk_level }) => risk_level),
        ['HIGH', 'MEDIUM', 'HIGH'],
      );
    });
  });
});
