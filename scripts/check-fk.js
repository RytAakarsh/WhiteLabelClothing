const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const lines = env.split('\n');
const config = {};
lines.forEach(l => {
  const parts = l.split('=');
  if (parts.length >= 2) config[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const client = new Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT
      tc.table_name, kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE ccu.table_name = 'products';
  `);
  console.log('FKs referencing products:');
  console.log(res.rows);

  await client.end();
}

check().catch(console.error);
