import { NextResponse } from 'next/server';
import { getAudioFeatures } from '@/lib/spotify';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface AudioFeaturesResponse {
  error?: { message: string; status: number };
  key: number;
  mode: number;
  tempo: number;
  time_signature: number;
  duration_ms: number;
}

export async function GET(request: Request) {
  // Require authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Query parameter "id" is required' }, { status: 400 });
  }

  try {
    const features = await getAudioFeatures(id) as AudioFeaturesResponse;

    if (features.error) {
      return NextResponse.json(
        { error: features.error.message },
        { status: features.error.status }
      );
    }

    return NextResponse.json({
      key: features.key,
      mode: features.mode,
      tempo: features.tempo,
      time_signature: features.time_signature,
      duration_ms: features.duration_ms,
    });
  } catch (error) {
    logger.error('Spotify Features Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
