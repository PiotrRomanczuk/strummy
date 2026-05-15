import { getGoogleAuthUrl } from '@/lib/google';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const redirectUri = `${request.nextUrl.origin}/api/oauth2/callback`;
  const url = getGoogleAuthUrl(redirectUri);
  redirect(url);
}
