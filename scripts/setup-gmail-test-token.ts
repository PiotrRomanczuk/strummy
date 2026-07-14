/**
 * One-time setup: get a Gmail refresh token for romanczukpiotr95@gmail.com.
 *
 * This token is used by tests/helpers/gmail.ts to read the student inbox
 * and assert that invite emails arrive in the real Gmail inbox (remote runs).
 *
 * Run once:
 *   npx ts-node --project tsconfig.json scripts/setup-gmail-test-token.ts
 *
 * Then add the printed token to .env.local as GMAIL_TEST_REFRESH_TOKEN=<value>
 * and to Vercel env as well (for CI / preview runs).
 *
 * Requires:
 *   GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 *
 * Also requires http://localhost:3333 added to "Authorised redirect URIs"
 * in Google Cloud Console → APIs & Services → Credentials → your OAuth2 client.
 */

import * as http from 'http';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\nBefore opening the URL, make sure http://localhost:3333 is added to');
  console.log('Authorised redirect URIs in Google Cloud Console for this OAuth2 client.\n');
  console.log('Opening browser for romanczukpiotr95@gmail.com authorisation...\n');

  // Spawn browser
  const { execSync } = await import('child_process');
  try {
    execSync(`open "${authUrl}"`);
  } catch {
    console.log('Could not open browser automatically. Open this URL manually:\n');
    console.log(' ', authUrl, '\n');
  }

  // Wait for the OAuth callback on localhost:3333
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400);
        res.end(`Error: ${error}. Close this tab and re-run the script.`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Authorised. You can close this tab.</h2>');
        server.close();
        resolve(code);
      }
    });

    server.listen(PORT, () => {
      console.log(`Waiting for Google to redirect to http://localhost:${PORT} ...`);
    });

    server.on('error', reject);
  });

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      '\nNo refresh_token returned. This can happen if the account already authorised this app.\n' +
        'Go to https://myaccount.google.com/permissions, revoke access for the app, then re-run.'
    );
    process.exit(1);
  }

  console.log('\n✓ Got refresh token. Add this to .env.local and Vercel env:\n');
  console.log(`GMAIL_TEST_REFRESH_TOKEN=${tokens.refresh_token}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
