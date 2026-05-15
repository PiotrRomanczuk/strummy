/**
 * GET /api/api-keys - List all API keys for the current user
 * POST /api/api-keys - Create a new API key
 * DELETE /api/api-keys/[id] - Delete a specific API key
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(100, 'API key name must not exceed 100 characters')
    .trim(),
});

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all API keys for the user (without the hash)
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, last_used_at, created_at, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[API Keys] Error fetching keys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(keys || []);
  } catch (error) {
    logger.error('[API Keys] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = CreateApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    const { generateApiKey, hashApiKey } = await import('@/lib/api-keys');

    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    // Insert the hashed key into the database
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name,
        key_hash: keyHash,
      })
      .select('id, name, created_at')
      .single();

    if (insertError) {
      logger.error('[API Keys] Error creating key:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Return the plain key only once (it cannot be retrieved later)
    return NextResponse.json(
      {
        ...newKey,
        key: plainKey,
        warning: 'Save your API key now. You will not be able to see it again.',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[API Keys] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
