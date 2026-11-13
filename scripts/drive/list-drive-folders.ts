/**
 * List all folders in the parent Google Drive folder
 * Run with: npx tsx scripts/drive/list-drive-folders.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { getServiceAccountDriveClient } from '../../lib/services/google-drive-service-account';

async function listFolders() {
  console.log('📁 Listing folders in Google Drive...\n');

  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!.split('?')[0];
  console.log(`Parent Folder ID: ${parentFolderId}\n`);

  try {
    const drive = getServiceAccountDriveClient();

    const res = await drive.files.list({
      q: `'${parentFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 100,
    });

    const files = res.data.files || [];

    if (files.length === 0) {
      console.log('❌ No files or folders found.');
      console.log('\n💡 This might mean:');
      console.log('   1. The service account does not have access to this folder');
      console.log('   2. The folder ID is incorrect');
      console.log('   3. The folder is empty');
      console.log('\n   Service account email:');
      const serviceKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
      console.log(`   ${serviceKey.client_email}`);
      console.log('\n   Share the folder with this email and try again.');
      return;
    }

    console.log(`✅ Found ${files.length} item(s):\n`);

    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const otherFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    if (folders.length > 0) {
      console.log(`📁 Folders (${folders.length}):`);
      folders.forEach((folder, i) => {
        console.log(`   ${i + 1}. "${folder.name}" (ID: ${folder.id})`);
      });
    }

    if (otherFiles.length > 0) {
      console.log(`\n📄 Files (${otherFiles.length}):`);
      otherFiles.slice(0, 10).forEach((file, i) => {
        console.log(`   ${i + 1}. "${file.name}" (${file.mimeType})`);
      });
      if (otherFiles.length > 10) {
        console.log(`   ... and ${otherFiles.length - 10} more files`);
      }
    }

    console.log('\n💡 Looking for "07_Guitar Videos"?');
    const match = folders.find(f => f.name === '07_Guitar Videos');
    if (match) {
      console.log(`   ✅ Found it! ID: ${match.id}`);
    } else {
      console.log('   ❌ Not found with exact name "07_Guitar Videos"');
      const similar = folders.filter(f =>
        f.name?.toLowerCase().includes('guitar') ||
        f.name?.toLowerCase().includes('video')
      );
      if (similar.length > 0) {
        console.log('\n   Similar folders found:');
        similar.forEach(f => console.log(`      • "${f.name}"`));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);

    if (error instanceof Error && error.message.includes('403')) {
      console.log('\n📝 Permission denied (403 error)');
      console.log('   The service account needs access to this folder.');
      const serviceKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
      console.log(`   Share the folder with: ${serviceKey.client_email}`);
    }
  }

  console.log('\n');
}

listFolders().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
