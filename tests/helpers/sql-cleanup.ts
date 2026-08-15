import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ProductionCleanupRefused, isProductionUrl } from './cleanup';

dotenv.config({ path: '.env.local' });

export async function runSqlCleanup() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log('Skipping SQL cleanup: DATABASE_URL not set');
    return;
  }

  // Same bar as cleanupAllTestData: this executes a DELETE script, so it must
  // never point at production. See the note there for the 2026-08-06 incident.
  if (isProductionUrl(dbUrl)) {
    throw new ProductionCleanupRefused(
      `REFUSING to run tests/sql/cleanup.sql: DATABASE_URL points at production ` +
        `(${new URL(dbUrl).hostname}). That script deletes rows from the live database.`
    );
  }

  console.log('Executing SQL cleanup script via direct database connection...');

  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    const sqlPath = path.join(__dirname, '..', 'sql', 'cleanup.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('✅ SQL cleanup executed successfully.');
    } else {
      console.warn('SQL cleanup script not found at', sqlPath);
    }
  } catch (error) {
    console.error('❌ Error executing SQL cleanup:', error);
  } finally {
    await client.end();
  }
}
