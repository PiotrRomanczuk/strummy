/**
 * Provider Circuit Breaker
 *
 * Tracks recent errors per provider. When a provider exceeds the error
 * threshold, marks it unhealthy for a cooldown window and routes to fallback.
 */

const WINDOW_MS = 30_000; // 30 seconds
const ERROR_THRESHOLD = 5;
const COOLDOWN_MS = 60_000; // 60 seconds

interface ProviderHealth {
  recentErrors: number[]; // timestamps of recent errors
  unhealthyUntil: number; // 0 = healthy
}

const healthMap = new Map<string, ProviderHealth>();

function getHealth(providerName: string): ProviderHealth {
  if (!healthMap.has(providerName)) {
    healthMap.set(providerName, { recentErrors: [], unhealthyUntil: 0 });
  }
  return healthMap.get(providerName)!;
}

export function recordProviderError(providerName: string): void {
  const health = getHealth(providerName);
  const now = Date.now();

  // Prune errors outside the window
  health.recentErrors = health.recentErrors.filter((t) => now - t < WINDOW_MS);
  health.recentErrors.push(now);

  if (health.recentErrors.length >= ERROR_THRESHOLD) {
    health.unhealthyUntil = now + COOLDOWN_MS;
    health.recentErrors = [];
  }
}

export function recordProviderSuccess(providerName: string): void {
  const health = getHealth(providerName);
  health.recentErrors = [];
  // Don't reset unhealthyUntil mid-cooldown — let it expire naturally
}

export function isProviderHealthy(providerName: string): boolean {
  const health = getHealth(providerName);
  return Date.now() > health.unhealthyUntil;
}

export function getProviderHealthSnapshot(): Record<
  string,
  { healthy: boolean; recentErrors: number }
> {
  const snapshot: Record<string, { healthy: boolean; recentErrors: number }> = {};
  for (const [name, health] of healthMap) {
    snapshot[name] = {
      healthy: Date.now() > health.unhealthyUntil,
      recentErrors: health.recentErrors.length,
    };
  }
  return snapshot;
}
