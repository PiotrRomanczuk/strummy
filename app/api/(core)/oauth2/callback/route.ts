import { getGoogleOAuth2Client } from '@/lib/google';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return redirect('/dashboard?error=google_auth_error');
  }

  if (!code) {
    return redirect('/dashboard?error=no_code');
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirect('/login?error=unauthorized');
    }

    const redirectUri = `${request.nextUrl.origin}/api/oauth2/callback`;
    const oauth2Client = getGoogleOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in database
    const { error: dbError } = await supabase.from('user_integrations').upsert({
      user_id: user.id,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiry_date,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      logger.error('Error storing tokens:', dbError);
      return redirect('/dashboard?error=db_error');
    }

    return redirect('/dashboard?success=google_connected');
  } catch (error) {
    logger.error('Error exchanging code for tokens:', error);
    return redirect('/dashboard?error=token_exchange_error');
  }
}
