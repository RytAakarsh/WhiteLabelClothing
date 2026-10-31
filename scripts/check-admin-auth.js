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
  const res = await client.query("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'is_admin'");
  console.log('is_admin definition:');
  console.log(res.rows[0]?.pg_get_functiondef);

  const authUser = await client.query("SELECT id, email, raw_user_meta_data, raw_app_meta_data FROM auth.users WHERE email = 'info.whitelabelclothing@gmail.com'");
  console.log('Admin auth user:');
  console.log(authUser.rows[0]);

  const userRoles = await client.query("SELECT * FROM user_roles");
  console.log('All user_roles:');
  console.log(userRoles.rows);

  await client.end();
}

check().catch(console.error);
