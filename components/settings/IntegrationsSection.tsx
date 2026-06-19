'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectGoogle } from '@/app/dashboard/calendar-actions';

interface IntegrationsSectionProps {
  isGoogleConnected: boolean;
}

export function IntegrationsSection({ isGoogleConnected }: IntegrationsSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDisconnecting, startDisconnect] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    setLoading(true);
    router.push('/api/auth/google');
  };

  const handleDisconnect = () => {
    setError(null);
    startDisconnect(async () => {
      const result = await disconnectGoogle();
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? 'Failed to disconnect');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Manage your connections to third-party services.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to automatically sync lessons and create shadow users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isGoogleConnected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600 dark:text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Not connected</span>
                </>
              )}
            </div>

            {isGoogleConnected ? (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-full sm:w-auto"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
