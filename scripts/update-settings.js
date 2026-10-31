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

async function updateAnnouncement() {
  await client.connect();
  const res = await client.query(
    "UPDATE store_settings SET value = jsonb_set(value, '{text}', $1::jsonb) WHERE key = 'announcement_bar' RETURNING *",
    [JSON.stringify("NEW ARRIVALS: MONOCHROME ESSENTIALS & WINTER OUTERWEAR")]
  );
  console.log('Updated announcement bar:', res.rows);
  await client.end();
}
updateAnnouncement().catch(console.error);
