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

async function checkSchema() {
  await client.connect();
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'");
  console.log('products columns:', cols.rows.map(r => r.column_name));
  const prods = await client.query('SELECT * FROM products');
  console.log('products rows count:', prods.rowCount);
  if (prods.rowCount > 0) console.log('first product:', prods.rows[0]);

  const ordCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
  console.log('orders columns:', ordCols.rows.map(r => r.column_name));

  await client.end();
}
checkSchema().catch(console.error);
