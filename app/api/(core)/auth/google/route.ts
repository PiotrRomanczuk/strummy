import { getGoogleAuthUrl } from '@/lib/google';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${request.nextUrl.origin}/api/oauth2/callback`;
  const url = getGoogleAuthUrl(redirectUri);
  redirect(url);
}
