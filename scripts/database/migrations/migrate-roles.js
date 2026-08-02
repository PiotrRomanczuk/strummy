const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function migrateRoles() {
  console.log('🔄 Migrating roles from profiles to user_roles...');

  // 1. Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, is_admin, is_teacher, is_student');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return;
  }

  console.log(`Found ${profiles.length} profiles.`);

  let migratedCount = 0;

  for (const profile of profiles) {
    const roles = [];
    if (profile.is_admin) roles.push('admin');
    if (profile.is_teacher) roles.push('teacher');
    if (profile.is_student) roles.push('student');

    for (const role of roles) {
      const { error } = await supabase
        .from('user_roles')
        .upsert(
          { profile_id: profile.id, role: role },
          { onConflict: 'profile_id, role', ignoreDuplicates: true }
        );

      if (error) {
        console.error(`Failed to migrate role ${role} for user ${profile.id}:`, error);
      } else {
        migratedCount++;
      }
    }
  }

  console.log(`✅ Migration complete. Migrated ${migratedCount} role assignments.`);
}

migrateRoles().catch(console.error);
