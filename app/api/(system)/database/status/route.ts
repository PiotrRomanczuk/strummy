/**
 * Database Status API Endpoint
 *
 * Provides backend status information about the current database connection.
 * This API can be used by both frontend and external services to check
 * which database the application is currently connected to.
 *
 * GET /api/database/status - Returns current database status
 * POST /api/database/status - Tests connection and returns detailed status
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseMiddleware } from '@/lib/database/middleware';
import { testConnection } from '@/lib/database/connection';
import { createClient } from '@/lib/supabase/server';

interface DatabaseStatusResponse {
  success: boolean;
  database: {
    type: 'local' | 'remote';
    url: string;
    isLocal: boolean;
    source: 'cookie' | 'header' | 'default';
  };
  availability: {
    localAvailable: boolean;
    remoteAvailable: boolean;
  };
  connection?: {
    isConnected: boolean;
    latency?: number;
    error?: string;
  };
  timestamp: string;
}

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

/**
 * GET - Returns current database configuration and routing info
 */
export async function GET(request: NextRequest): Promise<NextResponse<DatabaseStatusResponse | { error: string }>> {
  const auth = await verifyAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const dbInfo = DatabaseMiddleware.detectPreference(request);
    const localConfig = DatabaseMiddleware.getLocalConfig();
    const remoteConfig = DatabaseMiddleware.getRemoteConfig();

    const response: DatabaseStatusResponse = {
      success: true,
      database: {
        type: dbInfo.actualType,
        url: dbInfo.url,
        isLocal: dbInfo.actualType === 'local',
        source: dbInfo.source,
      },
      availability: {
        localAvailable: localConfig.isAvailable,
        remoteAvailable: remoteConfig.isAvailable,
      },
      timestamp: new Date().toISOString(),
    };

    const nextResponse = NextResponse.json(response);

    // Add database indicator headers
    DatabaseMiddleware.addHeaders(nextResponse, dbInfo);

    return nextResponse;
  } catch {
    return NextResponse.json(
      {
        success: false,
        database: {
          type: 'local' as const,
          url: '',
          isLocal: true,
          source: 'default' as const,
        },
        availability: {
          localAvailable: false,
          remoteAvailable: false,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Tests actual database connection and returns detailed status
 */
export async function POST(request: NextRequest): Promise<NextResponse<DatabaseStatusResponse | { error: string }>> {
  const auth = await verifyAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const dbInfo = DatabaseMiddleware.detectPreference(request);
    const localConfig = DatabaseMiddleware.getLocalConfig();
    const remoteConfig = DatabaseMiddleware.getRemoteConfig();

    // Test the actual connection
    const connectionResult = await testConnection();

    DatabaseMiddleware.log(dbInfo.actualType, 'Connection test', {
      isConnected: connectionResult.isConnected,
      latency: connectionResult.latency,
      error: connectionResult.error,
    });

    const response: DatabaseStatusResponse = {
      success: connectionResult.isConnected,
      database: {
        type: dbInfo.actualType,
        url: dbInfo.url,
        isLocal: dbInfo.actualType === 'local',
        source: dbInfo.source,
      },
      availability: {
        localAvailable: localConfig.isAvailable,
        remoteAvailable: remoteConfig.isAvailable,
      },
      connection: {
        isConnected: connectionResult.isConnected,
        latency: connectionResult.latency,
        error: connectionResult.error,
      },
      timestamp: new Date().toISOString(),
    };

    const nextResponse = NextResponse.json(response, {
      status: connectionResult.isConnected ? 200 : 503,
    });

    // Add database indicator headers
    DatabaseMiddleware.addHeaders(nextResponse, dbInfo);

    return nextResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        database: {
          type: 'local' as const,
          url: '',
          isLocal: true,
          source: 'default' as const,
        },
        availability: {
          localAvailable: false,
          remoteAvailable: false,
        },
        connection: {
          isConnected: false,
          error: errorMessage,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
