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

async function migrateAuth() {
  await client.connect();
  console.log('Connected to PostgreSQL.');

  // 1. Ensure info.whitelabelclothing@gmail.com has admin role in user_roles
  await client.query(`
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'admin'
    FROM auth.users
    WHERE LOWER(email) = 'info.whitelabelclothing@gmail.com'
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  `);
  console.log('Ensured admin role for info.whitelabelclothing@gmail.com in user_roles.');

  // 2. Update is_admin() function to be rock-solid
  await client.query(`
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    BEGIN
        -- Check if current authenticated user has email info.whitelabelclothing@gmail.com
        IF LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'info.whitelabelclothing@gmail.com' THEN
            RETURN true;
        END IF;

        -- Check user_roles table for role = 'admin'
        RETURN EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        );
    END;
    $$;
  `);
  console.log('Updated is_admin() function in PostgreSQL.');

  // 3. Update handle_new_user() trigger function
  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    BEGIN
        INSERT INTO public.profiles (id, full_name, phone)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
            COALESCE(NEW.raw_user_meta_data->>'phone', '')
        )
        ON CONFLICT (id) DO NOTHING;

        IF LOWER(COALESCE(NEW.email, '')) = 'info.whitelabelclothing@gmail.com' THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'admin')
            ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
        ELSE
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'customer')
            ON CONFLICT (user_id) DO NOTHING;
        END IF;

        RETURN NEW;
    END;
    $$;
  `);
  console.log('Updated handle_new_user() trigger function in PostgreSQL.');

  await client.end();
}

migrateAuth().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
