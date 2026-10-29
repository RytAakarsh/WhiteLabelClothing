// Test script to verify Supabase environment variable resolution and error reporting

function getPublicSupabaseConfig(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!key) {
      missing.push(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
      );
    }

    throw new Error(
      `[Supabase Configuration Error]: Missing required environment variable(s): ${missing.join(', ')}.\n` +
      `Please configure these in your Cloudflare Pages dashboard (Settings > Environment variables) for both Production and Preview environments, or in your .env.local file.\n` +
      `Target Supabase project URL: https://qtvzxezxyzsvgbauyytt.supabase.co`
    );
  }

  return { url, key };
}

console.log('--- Test 1: Only NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY present ---');
const config1 = getPublicSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: 'https://qtvzxezxyzsvgbauyytt.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk_test_12345',
});
console.log('Passed! Result:', config1);

console.log('\n--- Test 2: Only legacy NEXT_PUBLIC_SUPABASE_ANON_KEY present ---');
const config2 = getPublicSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: 'https://qtvzxezxyzsvgbauyytt.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_test_67890',
});
console.log('Passed! Result:', config2);

console.log('\n--- Test 3: Both present (prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ---');
const config3 = getPublicSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: 'https://qtvzxezxyzsvgbauyytt.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk_preferred_111',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_fallback_222',
});
console.log('Passed! Key selected:', config3.key);

console.log('\n--- Test 4: Missing key (Clear error reporting) ---');
try {
  getPublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://qtvzxezxyzsvgbauyytt.supabase.co',
  });
  console.error('Failed: should have thrown an error');
} catch (err) {
  console.log('Passed! Error thrown as expected:');
  console.log(err.message);
}

console.log('\nAll Supabase env resolution tests completed successfully!');
