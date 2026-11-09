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

// Real routes, auth, services and PostgreSQL SQL; only the DB transport is adapted.
describe('US-08 — reportar clasificaciones incorrectas', () => {
  let db, app, http;
  const token = 'a'.repeat(64);
  const otherToken = 'b'.repeat(64);
  const auth = { Authorization: 'Bearer ' + token };
  const otherAuth = { Authorization: 'Bearer ' + otherToken };

  function clientFor(connection) {
    return {
      async query(sql, params) {
        const result = await connection.query(sql, params);
        return {
          rows: result.rows,
          rowCount: result.rows.length || result.affectedRows || 0,
        };
      },
    };
  }

  before(async () => {
    db = new PGlite();
    for (const file of [
      '001_create_emails.sql',
      '002_analysis_and_quarantine.sql',
      '003_configuracion.sql',
      '003_auth.sql',
      '004_feedback.sql',
    ]) {
      const sql = await readFile(
        new URL('../../database/migrations/' + file, import.meta.url),
        'utf8',
      );
      await db.exec(sql);
      if (file === '004_feedback.sql') await db.exec(sql); // upgrade is repeatable
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({
        ...clientFor(db),
        transaction: (work) => db.transaction((tx) => work(clientFor(tx))),
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    http = request(app.getHttpServer());
  });
  beforeEach(async () => {
    await db.exec(`TRUNCATE emails, analysis_results, quarantine, email_feedback, users, sessions RESTART IDENTITY CASCADE;
      INSERT INTO users (email, password_hash) VALUES ('one@example.com', 'unused'), ('two@example.com', 'unused');`);
    for (const [id, value] of [
      [1, token],
      [2, otherToken],
    ]) {
      await db.query(
        "INSERT INTO sessions VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
        [tokenHash(value), id],
      );
    }
  });
  after(async () => {
    await app?.close();
    await db?.close();
  });

  async function email(
    subject = 'Verify account',
    content = 'Reset your password immediately',
  ) {
    const { rows } = await db.query(
      `INSERT INTO emails (sender, subject, content) VALUES ('person@example.com', $1, $2) RETURNING *`,
      [subject, content],
    );
    return rows[0];
  }
  async function analyze(item) {
    return (
      await http
        .post('/analysis/' + item.id)
        .set(auth)
        .expect(201)
    ).body;
  }
  function report(id, category, headers = auth) {
    return http
      .post('/feedback/' + id)
      .set(headers)
      .send({ category });
  }

  it('marks a malicious email as safe and saves a false positive with the original analysis', async () => {
    const item = await email();
    const analysis = await analyze(item);
    assert.equal(analysis.category, 'Malicious');
    const { body } = await report(item.id, 'Safe').expect(201);
    assert.equal(body.category, 'Safe');
    assert.equal(body.report_type, 'false_positive');
    assert.equal(body.original_risk, 'HIGH');
    assert.equal(body.user_id, 1);
    assert.ok(body.created_at);
    const { rows } = await db.query('SELECT * FROM email_feedback');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].analysis_id, body.analysis_id);
    assert.equal(rows[0].category, 'Safe');
    assert.equal(
      (await http.get('/feedback').set(auth).expect(200)).body[0].id,
      body.id,
    );
    // Feedback does not silently rewrite a machine decision or release quarantine.
    assert.equal(
      (await http.get('/quarantine').set(auth).expect(200)).body[0].id,
      item.id,
    );
    assert.equal(
      (await db.query('SELECT * FROM analysis_results')).rows.length,
      1,
    );
    assert.equal(
      (await db.query('SELECT * FROM emails')).rows[0].content,
      item.content,
    );
  });

  it('marks a safe email as dangerous and saves a false negative', async () => {
    const item = await email('Meeting tomorrow', 'See you tomorrow.');
    assert.equal((await analyze(item)).category, 'Safe');
    const { body } = await report(item.id, 'Malicious').expect(201);
    assert.equal(body.report_type, 'false_negative');
    assert.equal(body.original_risk, 'LOW');
    assert.equal(body.category, 'Malicious');
    const { body: available } = await http.get('/emails').set(auth).expect(200);
    assert.equal(available[0].risk_level, 'LOW');
  });

  it('records both corrections of a suspicious result', async () => {
    const item = await email('Urgent meeting', 'See you tomorrow.');
    assert.equal((await analyze(item)).category, 'Suspicious');
    assert.equal(
      (await report(item.id, 'Safe').expect(201)).body.report_type,
      'false_positive',
    );
    assert.equal(
      (await report(item.id, 'Malicious').expect(201)).body.report_type,
      'false_negative',
    );
  });

  it('treats agreement as confirmation rather than falsely reporting an error', async () => {
    const item = await email();
    await analyze(item);
    assert.equal(
      (await report(item.id, 'Malicious').expect(201)).body.report_type,
      'confirmation',
    );
  });

  it('deduplicates retries, preserves changed assessments and returns the latest', async () => {
    const item = await email();
    await analyze(item);
    const first = (await report(item.id, 'Safe').expect(201)).body;
    assert.equal((await report(item.id, 'Safe').expect(201)).body.id, first.id);
    await report(item.id, 'Malicious').expect(201);
    await report(item.id, 'Safe').expect(201);
    assert.equal(
      (await db.query('SELECT * FROM email_feedback')).rows.length,
      3,
    );
    const { body } = await http.get('/feedback').set(auth).expect(200);
    assert.equal(body.length, 1);
    assert.equal(body[0].category, 'Safe');
  });

  it('retains the analysis snapshot when the email is analyzed again', async () => {
    const item = await email();
    await analyze(item);
    const first = (await report(item.id, 'Safe').expect(201)).body;
    await analyze(item);
    const second = (await report(item.id, 'Safe').expect(201)).body;
    assert.notEqual(first.analysis_id, second.analysis_id);
    assert.equal(
      (await db.query('SELECT * FROM email_feedback')).rows.length,
      2,
    );
  });

  it('uses authenticated identity and returns only that user’s feedback', async () => {
    const item = await email();
    await analyze(item);
    await http
      .post('/feedback/' + item.id)
      .set(auth)
      .send({ category: 'Safe', user_id: 2 })
      .expect(201);
    assert.deepEqual(
      (await http.get('/feedback').set(otherAuth).expect(200)).body,
      [],
    );
    await report(item.id, 'Malicious', otherAuth).expect(201);
    assert.equal(
      (await http.get('/feedback').set(auth).expect(200)).body[0].category,
      'Safe',
    );
    assert.equal(
      (await http.get('/feedback').set(otherAuth).expect(200)).body[0].category,
      'Malicious',
    );
  });

  it('requires authentication for reading and reporting', async () => {
    await http.get('/feedback').expect(401);
    await http.post('/feedback/1').send({ category: 'Safe' }).expect(401);
  });

  it('rejects invalid input, missing emails and emails without analysis', async () => {
    const item = await email();
    await report(item.id, 'Safe').expect(409);
    await report(999999, 'Safe').expect(404);
    for (const id of ['abc', '0', '-1', '2147483648'])
      await report(id, 'Safe').expect(400);
    for (const category of ['Suspicious', 'safe', '', null, 1, {}, []])
      await report(item.id, category).expect(400);
    await http
      .post('/feedback/' + item.id)
      .set(auth)
      .send({})
      .expect(400);
    assert.deepEqual((await db.query('SELECT * FROM email_feedback')).rows, []);
  });

  it('does not report success or replace prior feedback when storage fails', async () => {
    const item = await email();
    await analyze(item);
    const first = (await report(item.id, 'Safe').expect(201)).body;
    await db.exec(
      "ALTER TABLE email_feedback ADD CONSTRAINT reject_dangerous CHECK (category = 'Safe')",
    );
    try {
      await report(item.id, 'Malicious').expect(500);
      const { body } = await http.get('/feedback').set(auth).expect(200);
      assert.equal(body.length, 1);
      assert.equal(body[0].id, first.id);
    } finally {
      await db.exec(
        'ALTER TABLE email_feedback DROP CONSTRAINT reject_dangerous',
      );
    }
  });
});
