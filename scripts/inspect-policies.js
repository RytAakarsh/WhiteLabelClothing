const { Client } = require('pg');

async function inspectDb() {
  const client = new Client({
    host: 'db.qtvzxezxyzsvgbauyytt.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Aakarsh@8851',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('--- Connected to db.qtvzxezxyzsvgbauyytt.supabase.co ---');

  // Verify project reference
  const dbInfo = await client.query('SELECT current_database(), current_user, version();');
  console.log('Database Info:', dbInfo.rows[0]);

  // Query all policies in public schema
  const policiesRes = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);

  console.log(`\nFound ${policiesRes.rows.length} existing policies in public schema:`);
  policiesRes.rows.forEach(p => {
    console.log(`- [${p.tablename}] "${p.policyname}" (${p.cmd})`);
    console.log(`    USING: ${p.qual}`);
    console.log(`    WITH CHECK: ${p.with_check}`);
  });

  // Specifically inspect public.payments
  const paymentPolicies = policiesRes.rows.filter(p => p.tablename === 'payments');
  console.log('\n--- Specific public.payments policies ---');
  console.log(paymentPolicies);

  // Check tables in public
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log('\n--- Existing tables in public ---');
  console.log(tables.rows.map(t => t.table_name));

  await client.end();
}

inspectDb().catch(console.error);
