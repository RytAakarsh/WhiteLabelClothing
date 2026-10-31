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
  const res = await client.query("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user'");
  console.log('handle_new_user definition:');
  console.log(res.rows[0]?.pg_get_functiondef);
  await client.end();
}

check().catch(console.error);
