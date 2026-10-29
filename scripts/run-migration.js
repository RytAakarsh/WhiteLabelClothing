const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20261029000000_initial_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to Supabase PostgreSQL at db.qtvzxezxyzsvgbauyytt.supabase.co...');
  const client = new Client({
    host: 'db.qtvzxezxyzsvgbauyytt.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Aakarsh@8851',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('Connected! Executing schema migration...');
    await client.query(sql);
    console.log('✅ Schema migration completed successfully!');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Created tables in public schema:', res.rows.map(r => r.table_name));

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
