
import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

const TEST_USERS = [
  {
    email: 'student@example.com',
    role: 'student',
    full_name: 'Test Student',
    is_student: true,
    is_teacher: false,
    is_admin: false
  },
  {
    email: 'teacher@example.com',
    role: 'teacher',
    full_name: 'Test Teacher',
    is_student: false,
    is_teacher: true,
    is_admin: false
  },
  {
    email: 'teststudent1@example.com',
    role: 'student',
    full_name: 'Test Student 1',
    is_student: true,
    is_teacher: false,
    is_admin: false
  },
    {
    email: 'teststudent2@example.com',
    role: 'student',
    full_name: 'Test Student 2',
    is_student: true,
    is_teacher: false,
    is_admin: false
  },
    {
    email: 'teststudent3@example.com',
    role: 'student',
    full_name: 'Test Student 3',
    is_student: true,
    is_teacher: false,
    is_admin: false
  },
  {
    email: 'p.romanczuk@gmail.com',
    role: 'admin',
    full_name: 'Admin User',
    is_student: false,
    is_teacher: false,
    is_admin: true
  }
];

async function main() {
  console.log('🔧 Ensuring Test Users Setup on Remote DB...');

  for (const testUser of TEST_USERS) {
    console.log(`\nProcessing ${testUser.email}...`);

    // 1. Get Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('Error listing users:', userError);
      continue;
    }
    
    const user = users.find(u => u.email === testUser.email);
    
    if (!user) {
      console.log(`❌ User ${testUser.email} not found in auth.users. Please create it first (or seed).`);
      // Optionally create it here, but typically seed handles this. For now assuming they exist as per inspection.
      continue; 
    }
    console.log(`✅ Found Auth User: ${user.id}`);

    // 2. Ensure Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
       console.error(`Error checking profile for ${testUser.email}:`, profileError);
       continue;
    }

    if (!profile) {
      console.log(`Creating profile for ${testUser.email}...`);
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: testUser.email,
          full_name: testUser.full_name,
          is_student: testUser.is_student,
          is_teacher: testUser.is_teacher,
          is_admin: testUser.is_admin,
          is_active: true
        });
      
      if (insertProfileError) {
        console.error(`❌ Failed to create profile:`, insertProfileError);
      } else {
        console.log(`✅ Profile created.`);
      }
    } else {
      console.log(`✅ Profile exists.`);
      // Optional: Update flags if they differ?
    }

    // 3. Ensure Role in user_roles
    // Check if role exists
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('profile_id', user.id)
      .eq('role', testUser.role);
    
    if (rolesError) {
      console.error(`Error checking roles:`, rolesError);
      continue;
    }

    if (!roles || roles.length === 0) {
      console.log(`Adding role '${testUser.role}'...`);
      const { error: insertRoleError } = await supabase
        .from('user_roles')
        .insert({
          profile_id: user.id,
          role: testUser.role
        });
      
      if (insertRoleError) {
         console.error(`❌ Failed to add role:`, insertRoleError);
      } else {
         console.log(`✅ Role added.`);
      }
    } else {
      console.log(`✅ Role '${testUser.role}' already exists.`);
    }
  }

  console.log('\n✨ Done.');
}

main().catch(console.error);
