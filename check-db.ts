import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const testTeacher = users?.users.find(u => u.email === 'p.romanczuk+testteacher@gmail.com');
  
  if (!testTeacher) {
    console.log('Test teacher not found');
    return;
  }
  
  console.log('Teacher ID:', testTeacher.id);
  
  // Actually, teacher_id in lessons/teacher_students is profile_id. Let's get profile_id.
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', 'p.romanczuk+testteacher@gmail.com').single();
  
  if (!profile) {
    console.log('Profile not found');
    return;
  }
  
  console.log('Profile ID:', profile.id);
  
  // Check teacher_students
  const { data: pairs, error } = await supabase.from('teacher_students').select('*').eq('teacher_id', profile.id);
  console.log('Pairs:', pairs, error);
  
  // Check lessons
  const { data: lessons, error: lErr } = await supabase.from('lessons').select('id, student_id, deleted_at').eq('teacher_id', profile.id);
  console.log('Lessons:', lessons, lErr);
}

main().catch(console.error);
