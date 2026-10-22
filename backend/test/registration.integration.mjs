import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { DatabaseService } from '../dist/database/database.service.js';
import { verifyPassword } from '../dist/auth/password.js';

// HTTP, auth, password hashing and SQL are real; only DB transport is adapted.
describe('US-13 — Registro de usuario', () => {
  let db, app, http;
  const valid = { email: 'new@example.com', password: 'Password!123' };
  before(async () => {
    db = new PGlite();
    for (const file of [
      '001_create_emails.sql',
      '002_analysis_and_quarantine.sql',
      '003_configuracion.sql',
      '003_auth.sql',
    ]) {
      await db.exec(
        await readFile(
          new URL('../../database/migrations/' + file, import.meta.url),
          'utf8',
        ),
      );
    }
    const query = async (sql, params) => {
      const result = await db.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rows.length || result.affectedRows || 0,
      };
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ query })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    http = request(app.getHttpServer());
  });
  beforeEach(async () => {
    await db.exec('TRUNCATE users, sessions RESTART IDENTITY CASCADE');
  });
  after(async () => {
    await app?.close();
    await db?.close();
  });
  const register = (body = valid) => http.post('/auth/register').send(body);

  it('CP-US13-01: creates an account with valid data and stores a salted hash', async () => {
    const { body } = await register().expect(201);
    assert.deepEqual(body, { user: { id: 1, email: valid.email } });
    const { rows } = await db.query('SELECT * FROM users');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, valid.email);
    assert.notEqual(rows[0].password_hash, valid.password);
    assert.ok(await verifyPassword(valid.password, rows[0].password_hash));
    assert.ok(!JSON.stringify(body).includes('password'));
    assert.deepEqual((await db.query('SELECT * FROM sessions')).rows, []);
  });

  it('the registered account can log in, access protected routes and log out', async () => {
    await register().expect(201);
    const { body } = await http.post('/auth/login').send(valid).expect(200);
    assert.match(body.token, /^[a-f0-9]{64}$/);
    const auth = { Authorization: 'Bearer ' + body.token };
    assert.deepEqual((await http.get('/auth/me').set(auth).expect(200)).body, {
      id: 1,
      email: valid.email,
    });
    await http.get('/emails').set(auth).expect(200);
    await http.post('/auth/logout').set(auth).expect(204);
    await http.get('/auth/me').set(auth).expect(401);
  });

  it('CP-US13-02: rejects an existing email without altering the original account', async () => {
    await register().expect(201);
    const before = (await db.query('SELECT * FROM users')).rows;
    const { body } = await register({
      ...valid,
      password: 'Different123!',
    }).expect(409);
    assert.match(body.message, /ya está registrado/);
    assert.deepEqual((await db.query('SELECT * FROM users')).rows, before);
    await http.post('/auth/login').send(valid).expect(200);
    await http
      .post('/auth/login')
      .send({ ...valid, password: 'Different123!' })
      .expect(401);
  });

  it('normalizes email casing and surrounding whitespace, including duplicate checks', async () => {
    const { body } = await register({
      ...valid,
      email: '  NEW@Example.COM  ',
    }).expect(201);
    assert.equal(body.user.email, valid.email);
    await register().expect(409);
    await register({ ...valid, email: 'New@EXAMPLE.com' }).expect(409);
    await http
      .post('/auth/login')
      .send({ ...valid, email: ' NEW@EXAMPLE.COM ' })
      .expect(200);
  });

  it('recognizes a legacy account whose stored email has uppercase letters', async () => {
    await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [
      'NEW@Example.com',
      'legacy-hash',
    ]);
    await register().expect(409);
    assert.equal((await db.query('SELECT * FROM users')).rows.length, 1);
  });

  it('handles simultaneous duplicate requests with one account and a 409 response', async () => {
    const results = await Promise.all([register(), register()]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await db.query('SELECT * FROM users')).rows.length, 1);
  });

  it('uses different salts for different users with the same password', async () => {
    await register().expect(201);
    await register({ ...valid, email: 'another@example.com' }).expect(201);
    const { rows } = await db.query(
      'SELECT password_hash FROM users ORDER BY id',
    );
    assert.notEqual(rows[0].password_hash, rows[1].password_hash);
  });

  it('rejects missing, invalid, oversized and non-string emails', async () => {
    for (const email of [
      '',
      ' ',
      'not-an-email',
      'user@',
      '@example.com',
      'a b@example.com',
      'a@@example.com',
      'a'.repeat(250) + '@x.com',
      null,
      1,
      {},
      [],
    ]) {
      await register({ ...valid, email }).expect(400);
    }
    await register({ password: valid.password }).expect(400);
    assert.deepEqual((await db.query('SELECT * FROM users')).rows, []);
  });

  it('rejects missing, short, whitespace-only, oversized and non-string passwords', async () => {
    for (const password of [
      '',
      'short',
      ' '.repeat(8),
      'p'.repeat(1025),
      null,
      1,
      {},
      [],
    ]) {
      await register({ ...valid, password }).expect(400);
    }
    await register({ email: valid.email }).expect(400);
    await http.post('/auth/register').expect(400);
    await register({}).expect(400);
    assert.deepEqual((await db.query('SELECT * FROM users')).rows, []);
  });

  it('accepts passwords at the length boundaries and preserves significant spaces', async () => {
    for (const [index, password] of [
      '12345678',
      'p'.repeat(1024),
      '  secret pass  ',
    ].entries()) {
      const body = { email: `boundary${index}@example.com`, password };
      await register(body).expect(201);
      await http.post('/auth/login').send(body).expect(200);
    }
  });

  it('leaves protected endpoints inaccessible without a session after registration', async () => {
    await register().expect(201);
    await http.get('/auth/me').expect(401);
    await http.post('/auth/logout').expect(401);
    await http.get('/emails').expect(401);
    await http.get('/configuracion').expect(401);
  });

  it('does not accept client-supplied IDs, roles, password hashes or session tokens', async () => {
    const { body } = await register({
      ...valid,
      id: 99,
      role: 'admin',
      password_hash: 'plain',
      token: 'fake',
    }).expect(201);
    assert.deepEqual(body, { user: { id: 1, email: valid.email } });
    const { rows } = await db.query('SELECT * FROM users');
    assert.ok(await verifyPassword(valid.password, rows[0].password_hash));
    assert.deepEqual((await db.query('SELECT * FROM sessions')).rows, []);
  });

  it('does not report success when account storage fails', async () => {
    await db.exec(
      "ALTER TABLE users ADD CONSTRAINT reject_test_user CHECK (email <> 'new@example.com')",
    );
    try {
      await register().expect(500);
      assert.deepEqual((await db.query('SELECT * FROM users')).rows, []);
    } finally {
      await db.exec('ALTER TABLE users DROP CONSTRAINT reject_test_user');
    }
  });
});
