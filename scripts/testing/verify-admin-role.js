const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '❌ Missing Supabase environment variables (need URL, ANON_KEY, and SERVICE_ROLE_KEY)'
  );
  process.exit(1);
}

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyAdmin() {
  const email = 'p.romanczuk@gmail.com';
  const password = 'test123_admin';

  console.log(`Attempting login for ${email}...`);

  const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error(`❌ Login failed: ${authError.message}`);
    return;
  }

  console.log(`✅ Login successful. User ID: ${authData.user.id}`);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .single();

  if (profileError || !profile) {
    console.error(`❌ Failed to resolve profile: ${profileError?.message ?? 'not found'}`);
    return;
  }

  console.log('Fetching roles to verify (using Service Role to bypass RLS)...');

  const { data: roles, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('profile_id', profile.id);

  if (roleError) {
    console.error(`❌ Failed to fetch roles: ${roleError.message}`);
    return;
  }

  const userRoles = roles.map((r) => r.role);
  console.log('User roles:', userRoles);

  if (userRoles.includes('admin') && userRoles.includes('teacher')) {
    console.log('✅ SUCCESS: User is both Admin and Teacher.');
  } else {
    console.error('❌ FAILURE: User roles are incorrect.');
    console.error(`   Roles found: ${userRoles.join(', ')}`);
  }
}

verifyAdmin();
