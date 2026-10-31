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

async function checkAllPolicies() {
  await client.connect();
  const res = await client.query(`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    ORDER BY tablename, cmd;
  `);
  console.log('All Policies:');
  for (const r of res.rows) {
    console.log(`${r.tablename.padEnd(20)} | ${r.cmd.padEnd(6)} | ${r.policyname}`);
  }
  await client.end();
}

checkAllPolicies().catch(console.error);
