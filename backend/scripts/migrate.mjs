import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'mailwatch',
  password: process.env.PGPASSWORD ?? 'mailwatch',
  database: process.env.PGDATABASE ?? 'mailwatch',
  connectionTimeoutMillis: 5000,
});
const client = await pool.connect().catch(async (error) => {
  console.error('No se pudo conectar a PostgreSQL. Inicia Docker y comprueba las variables PGHOST, PGPORT, PGUSER, PGPASSWORD y PGDATABASE.');
  await pool.end();
  throw error;
});
try {
  for (const file of ['001_create_emails.sql', '002_analysis_and_quarantine.sql']) {
    const sql = await readFile(new URL('../../database/migrations/' + file, import.meta.url), 'utf8');
    await client.query(sql);
    console.log('Aplicada: ' + file);
  }
} finally {
  client.release();
  await pool.end();
}
