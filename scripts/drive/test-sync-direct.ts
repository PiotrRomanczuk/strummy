/**
 * Test the actual sync function with the new logic
 * Run with: npx tsx scripts/drive/test-sync-direct.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { createAdminClient } from '../../lib/supabase/admin';
import { syncDriveVideosToSongs } from '../../lib/services/drive-video-sync';

async function testSync() {
  console.log('🔍 Testing Drive Video Sync...\n');

  try {
    const adminClient = createAdminClient();

    // Get a test user ID (admin)
    const { data: users } = await adminClient.auth.admin.listUsers();
    const adminUser = users.users.find((u) => u.email === 'p.romanczuk@gmail.com');

    if (!adminUser) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log(`✅ Using admin user: ${adminUser.email}\n`);

    // Test sync with dry run (no folderName specified → uses folder directly)
    console.log('📁 Running sync preview (dry run)...\n');
    const result = await syncDriveVideosToSongs({
      dryRun: true,
      uploadedByUserId: adminUser.id,
      supabase: adminClient,
      // Note: No folderName specified, so it will use the folder ID directly
    });

    console.log('✅ Sync preview successful!\n');
    console.log(`📊 Results:`);
    console.log(`   Total files: ${result.totalFiles}`);
    console.log(`   Matched: ${result.matched}`);
    console.log(`   Review queue: ${result.reviewQueue}`);
    console.log(`   Unmatched: ${result.unmatched}`);
    console.log(`   Skipped (already synced): ${result.skipped}`);

    if (result.results.length > 0) {
      console.log(`\n📹 Sample matches (first 5):`);
      result.results.slice(0, 5).forEach((r, i) => {
        const status = r.status === 'matched' ? '✅' : r.status === 'review_queue' ? '⚠️' : '❌';
        const match = r.bestMatch
          ? ` → ${r.bestMatch.song.title} by ${r.bestMatch.song.author}`
          : '';
        console.log(`   ${i + 1}. ${status} ${r.driveFile.name}${match}`);
      });
    }

    console.log('\n✨ Test complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

testSync();
