/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Server, Laptop, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface DatabaseStatusProps {
  className?: string;
  variant?: 'fixed' | 'inline';
  /**
   * Whether a local DB is configured, resolved on the server at request time.
   * Preferred over the client-side `process.env` check, which depends on the
   * value being inlined into the client bundle (stale until a full dev restart).
   */
  hasLocalDb?: boolean;
}

export function DatabaseStatus({ className, variant = 'fixed', hasLocalDb }: DatabaseStatusProps) {
  const [isLocal, setIsLocal] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocalEnv, setHasLocalEnv] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>(
    'unknown'
  );

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      // Check cookie preference
      const match = document.cookie.match(new RegExp('(^| )sb-provider-preference=([^;]+)'));
      const currentPref = match && match[2] === 'remote' ? 'remote' : 'local';

      // Prefer the server-resolved flag; fall back to the client-inlined env var.
      const hasLocal = hasLocalDb ?? !!process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
      setHasLocalEnv(hasLocal);

      // Determine what we are actually connected to
      const actuallyLocal = currentPref === 'local' && hasLocal;
      setIsLocal(actuallyLocal);

      // Test actual connection
      let supabase;
      try {
        supabase = createClient();
      } catch (err) {
        logger.error('[DatabaseStatus] Failed to create Supabase client:', err);
        setConnectionStatus('error');
        return;
      }

      // Get the URL from the client to display it

      const clientUrl = (supabase as any).supabaseUrl;

      // Test basic connectivity first
      try {
        await fetch(`${clientUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            apikey: (supabase as any).supabaseKey,
          },
        });

        // Try a direct REST call to profiles table
        const restResponse = await fetch(`${clientUrl}/rest/v1/profiles?select=count&limit=0`, {
          method: 'HEAD',
          headers: {
            apikey: (supabase as any).supabaseKey,
            'Content-Type': 'application/json',
          },
        });

        if (restResponse.ok) {
          setConnectionStatus('connected');
          return;
        }
      } catch {
        setConnectionStatus('error');
        toast.error(`Cannot reach ${clientUrl}`);
        return;
      }

      // Create a timeout promise (20 seconds - increased for slower connections)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error('Connection check timed out'));
        }, 20000)
      );

      // Try a simple query with explicit timeout handling
      const checkPromise = (async () => {
        try {
          const result = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });
          return result;
        } catch (queryError) {
          throw queryError;
        }
      })();

      const result = (await Promise.race([checkPromise, timeoutPromise])) as any;
      const { error } = result;

      if (error) {
        if (error.message?.includes('Invalid API key')) {
          setConnectionStatus('error');
          toast.error(`Invalid API Key for ${clientUrl}. Check your .env file.`);
        } else if (error.code === 'PGRST301' || error.code === '42501') {
          // RLS error means we connected successfully!
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
          if (error.message === 'Connection check timed out') {
            toast.error(`Connection timed out connecting to ${clientUrl}`);
          }
        }
      } else {
        setConnectionStatus('connected');
      }
    } catch {
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = () => {
    if (!hasLocalEnv) {
      toast.info('Local database configuration not found. Cannot switch to local.');
      return;
    }

    const newPref = isLocal ? 'remote' : 'local';
    // Set cookie for 1 year
    document.cookie = `sb-provider-preference=${newPref}; path=/; max-age=31536000`;

    toast.success(`Switched to ${newPref} database. Reloading...`);

    // Reload to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'backdrop-blur-md shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 px-3 py-1.5',
        connectionStatus === 'error'
          ? 'bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20'
          : isLocal
            ? 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20'
            : 'bg-warning/10 border-warning/50 text-warning hover:bg-warning/20',
        className
      )}
      onClick={togglePreference}
    >
      <div className="flex items-center gap-2">
        {loading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : connectionStatus === 'error' ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : isLocal ? (
          <Laptop className="w-3.5 h-3.5" />
        ) : (
          <Server className="w-3.5 h-3.5" />
        )}
        <div className="flex flex-col items-start leading-none">
          <span className="font-medium text-xs">
            {loading ? 'Checking...' : isLocal ? 'Local DB' : 'Remote DB'}
          </span>
          {!loading && (
            <span className="text-[10px] opacity-80">
              {connectionStatus === 'error'
                ? 'Connection Failed'
                : isLocal
                  ? 'localhost:54321'
                  : 'supabase.co'}
            </span>
          )}
        </div>
      </div>
    </Badge>
  );

  if (variant === 'fixed') {
    return <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">{badge}</div>;
  }

  return badge;
}
