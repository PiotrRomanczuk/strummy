import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Database } from '../types/database.types';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function verifySongs() {
  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting songs:', error);
    return;
  }

  console.log(`Total songs in database: ${count}`);

  const { data, error: listError } = await supabase
    .from('songs')
    .select('id, title, author')
    .limit(5);

  if (listError) {
    console.error('Error listing songs:', listError);
    return;
  }

  console.log('Sample songs:', data);
}

verifySongs();
