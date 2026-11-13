import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Lab is a local-only, admin-only view over the owner's private data hub. It switches on only
 * when `PRIVATE_DATA_DIR` (server-side, set in `.env.local` on the owner's Mac) points at a folder
 * with the hub's `manifest.json`. On Vercel the variable is unset, so every Lab surface 404s.
 */
export function getPrivateDataDir(): string | null {
  const dir = process.env.PRIVATE_DATA_DIR?.trim();
  return dir ? dir : null;
}

export function isPrivateDataAvailable(): boolean {
  const dir = getPrivateDataDir();
  return dir !== null && existsSync(join(dir, 'manifest.json'));
}

/** Resolves a path inside the hub; only fixed, code-chosen segments ever reach this. */
export function hubPath(...segments: string[]): string {
  const dir = getPrivateDataDir();
  if (!dir) throw new Error('PRIVATE_DATA_DIR is not set');
  return join(dir, ...segments);
}
