import { randomBytes, scryptSync } from 'node:crypto';
import { Pool } from 'pg';
const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.MAILWATCH_PASSWORD;
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !password ||
  password.length < 8 ||
  password.length > 1024
) {
  console.error(
    'Uso: MAILWATCH_PASSWORD en el entorno (8–1024 caracteres), npm run user:create -- correo@ejemplo.com',
  );
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'mailwatch',
  password: process.env.PGPASSWORD ?? 'mailwatch',
  database: process.env.PGDATABASE ?? 'mailwatch',
});
try {
  await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [
    email,
    hash,
  ]);
  console.log('Cuenta creada. Ya puedes iniciar sesión.');
} catch (error) {
  console.error(
    error.code === '23505'
      ? 'El correo ya está registrado.'
      : 'No se pudo crear la cuenta. Comprueba la base de datos y las migraciones.',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
