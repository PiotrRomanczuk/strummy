import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRoles() {
  const email = 'student@example.com';

  // Get user ID
  const {
    data: { users },
    error: userError,
  } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('Error listing users:', userError);
    return;
  }

  const user = users.find((u) => u.email === email);

  if (!user) {
    console.log(`User ${email} not found in Auth.`);
    return;
  }

  console.log(`User found: ${user.id}`);

  // user_roles.profile_id is a profiles.id FK, not the auth id — resolve the
  // profile first or this matches nothing for any user whose ids differ.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('No profile found for auth user:', profileError);
    return;
  }

  // Get roles
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('profile_id', profile.id);

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return;
  }

  console.log('Roles:', roles);
}

checkUserRoles();
