#!/usr/bin/env tsx

/**
 * Consolidated Database Inspection Script
 * Inspects users, profiles, roles, and authentication data
 *
 * Usage:
 *   npx tsx scripts/database/inspect-db.ts              # Show summary
 *   npx tsx scripts/database/inspect-db.ts users        # List auth users
 *   npx tsx scripts/database/inspect-db.ts profiles     # List profiles
 *   npx tsx scripts/database/inspect-db.ts roles        # Check user roles
 *   npx tsx scripts/database/inspect-db.ts auth         # Inspect auth metadata
 *   npx tsx scripts/database/inspect-db.ts all          # Show everything
 *   npx tsx scripts/database/inspect-db.ts --local      # Use local database
 */

import { config } from 'dotenv';
import { join } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

const COMMANDS = ['users', 'profiles', 'roles', 'auth', 'all', 'summary'] as const;
type Command = (typeof COMMANDS)[number];

// Local Supabase credentials
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function getClient(useLocal: boolean): SupabaseClient {
  if (useLocal) {
    console.log('📍 Using LOCAL database\n');
    return createClient(LOCAL_URL, LOCAL_SERVICE_KEY);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing Supabase credentials. Set in .env.local or use --local flag');
    process.exit(1);
  }

  console.log('📍 Using REMOTE database\n');
  return createClient(url, key);
}

async function listUsers(supabase: SupabaseClient) {
  console.log('👤 AUTH USERS');
  console.log('=============');

  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  console.log(`Found ${users.length} users:\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email || 'No email'}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Confirmed: ${user.email_confirmed_at ? '✅' : '❌'}`);
    console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
    console.log('');
  });
}

async function listProfiles(supabase: SupabaseClient) {
  console.log('📋 PROFILES');
  console.log('===========');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error.message);
    return;
  }

  console.log(`Found ${profiles?.length || 0} profiles:\n`);

  profiles?.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.full_name || profile.email || 'Unknown'}`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Email: ${profile.email || 'N/A'}`);
    console.log(`   Roles: Student=${profile.is_student}, Teacher=${profile.is_teacher}, Admin=${profile.is_admin}`);
    console.log(`   Created: ${profile.created_at}`);
    console.log('');
  });
}

async function checkRoles(supabase: SupabaseClient) {
  console.log('🎭 USER ROLES');
  console.log('=============');

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select(
      `
      *,
      profiles:profile_id (full_name, email)
    `
    );

  if (error) {
    console.error('Error fetching roles:', error.message);
    return;
  }

  console.log(`Found ${roles?.length || 0} role assignments:\n`);

  roles?.forEach((role, index) => {
    const profile = role.profiles as { full_name?: string; email?: string } | null;
    console.log(`${index + 1}. ${profile?.full_name || profile?.email || 'Unknown'}`);
    console.log(`   Role: ${role.role}`);
    console.log(`   User ID: ${role.profile_id}`);
    console.log('');
  });

  // Summary by role
  const roleCounts = roles?.reduce((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Summary:');
  Object.entries(roleCounts || {}).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });
}

async function inspectAuth(supabase: SupabaseClient) {
  console.log('🔐 AUTH METADATA');
  console.log('================');

  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({ perPage: 10 });

  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  console.log(`Showing first 10 users with auth details:\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Confirmed: ${user.email_confirmed_at || 'No'}`);
    console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`);
    console.log(`   App Metadata:`, JSON.stringify(user.app_metadata, null, 2));
    console.log(`   User Metadata:`, JSON.stringify(user.user_metadata, null, 2));
    console.log(`   Providers:`, user.identities?.map((i) => i.provider).join(', ') || 'None');
    console.log('');
  });
}

async function showSummary(supabase: SupabaseClient) {
  console.log('📊 DATABASE SUMMARY');
  console.log('===================\n');

  // Count users
  const {
    data: { users },
  } = await supabase.auth.admin.listUsers();
  console.log(`Auth Users: ${users?.length || 0}`);

  // Count profiles
  const { count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  console.log(`Profiles: ${profileCount || 0}`);

  // Count roles
  const { count: roleCount } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true });
  console.log(`Role Assignments: ${roleCount || 0}`);

  // Count songs
  const { count: songCount } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true });
  console.log(`Songs: ${songCount || 0}`);

  // Count lessons
  const { count: lessonCount } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true });
  console.log(`Lessons: ${lessonCount || 0}`);
}

async function main() {
  console.log('🔍 DATABASE INSPECTION UTILITY');
  console.log('==============================\n');

  const args = process.argv.slice(2);
  const useLocal = args.includes('--local');
  const command = (args.find((a) => !a.startsWith('-')) as Command) || 'summary';

  if (!COMMANDS.includes(command)) {
    console.error(`❌ Unknown command: ${command}`);
    console.log(`Available commands: ${COMMANDS.join(', ')}`);
    process.exit(1);
  }

  const supabase = getClient(useLocal);

  try {
    if (command === 'users' || command === 'all') {
      await listUsers(supabase);
      console.log('');
    }

    if (command === 'profiles' || command === 'all') {
      await listProfiles(supabase);
      console.log('');
    }

    if (command === 'roles' || command === 'all') {
      await checkRoles(supabase);
      console.log('');
    }

    if (command === 'auth' || command === 'all') {
      await inspectAuth(supabase);
      console.log('');
    }

    if (command === 'summary') {
      await showSummary(supabase);
    }

    console.log('✅ Inspection complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
