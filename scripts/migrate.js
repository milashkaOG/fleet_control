require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const migrationsDirectory = path.join(__dirname, '..', 'migrations');

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationFiles = fs
      .readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const filename of migrationFiles) {
      const existingMigration = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (existingMigration.rowCount > 0) {
        console.log(`Migration already applied: ${filename}`);
        continue;
      }

      const sql = fs.readFileSync(
        path.join(migrationsDirectory, filename),
        'utf8'
      );

      console.log(`Applying migration: ${filename}`);

      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );

        await client.query('COMMIT');

        console.log(`Migration applied successfully: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations are up to date.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed:');
  console.error(error);
  process.exit(1);
});