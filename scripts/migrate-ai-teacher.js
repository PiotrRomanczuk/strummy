require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const aiTeacherId = '00000000-0000-0000-0000-000000000001';

  console.log('Inserting AI Teacher profile...');
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: aiTeacherId,
      user_id: null,
      email: 'ai.coach@strummy.online',
      full_name: 'Strummy AI Coach',
      first_name: 'Strummy',
      last_name: 'AI Coach',
      is_admin: false,
      is_teacher: true,
      is_student: false,
      is_shadow: true,
      is_active: true,
      notes: 'System profile used to manage solo learners without human teachers.'
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error inserting profile:', error);
    process.exit(1);
  }

  console.log('Inserting AI Teacher role...');
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: aiTeacherId,
      role: 'teacher'
    }, { onConflict: 'user_id, role' });

  if (roleError) {
    console.error('Error inserting role:', roleError);
    process.exit(1);
  }

  console.log('Successfully created System AI Teacher!');
}

run();
