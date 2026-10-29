const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const SUPABASE_URL = 'https://qtvzxezxyzsvgbauyytt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dnp4ZXp4eXpzdmdiYXV5eXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzI4NzY0MiwiZXhwIjoyMTA4ODYzNjQyfQ.Ux3jrRChvCTdOv1fvMbUO8yromE7wn7lp4DkqVsxjxs';
const ADMIN_EMAIL = 'info.whitelabelclothing@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Aakarsh@8851';

async function bootstrapAdmin() {
  console.log('Initializing Supabase Admin Client...');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if admin user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError);
    process.exit(1);
  }

  let adminUser = usersData.users.find(u => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    console.log(`Admin user ${ADMIN_EMAIL} does not exist yet. Creating...`);
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'White Label Admin',
        role: 'admin',
      },
    });

    if (createError) {
      console.error('Error creating admin user:', createError);
      process.exit(1);
    }
    adminUser = createdUser.user;
    console.log('Admin user created successfully with ID:', adminUser.id);
  } else {
    console.log(`Admin user ${ADMIN_EMAIL} already exists (ID: ${adminUser.id}). Updating password & metadata...`);
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'White Label Admin',
        role: 'admin',
      },
    });
    if (updateError) {
      console.error('Error updating admin user:', updateError);
      process.exit(1);
    }
    adminUser = updatedUser.user;
  }

  // Ensure role is admin in public.user_roles and profile exists
  console.log('Setting admin role in public.user_roles table...');
  const pgClient = new Client({
    host: 'db.qtvzxezxyzsvgbauyytt.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Aakarsh@8851',
    ssl: { rejectUnauthorized: false },
  });

  await pgClient.connect();

  await pgClient.query(`
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES ($1, 'White Label Admin', '8851872245')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  `, [adminUser.id]);

  await pgClient.query(`
    INSERT INTO public.user_roles (user_id, role)
    VALUES ($1, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  `, [adminUser.id]);

  const roleCheck = await pgClient.query(`
    SELECT * FROM public.user_roles WHERE user_id = $1;
  `, [adminUser.id]);

  console.log('✅ Admin user verified in public.user_roles:', roleCheck.rows[0]);
  await pgClient.end();
  console.log('✅ Admin bootstrap completed successfully!');
}

bootstrapAdmin().catch(console.error);
