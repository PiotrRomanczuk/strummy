import { readFileSync, statSync } from 'node:fs';

import { hubPath, isPrivateDataAvailable } from './config';
import type { HubManifest, HubSource } from './private-data.types';

interface CachedManifest {
  file: string;
  mtimeMs: number;
  manifest: HubManifest;
}

// Survives dev-server module reloads; re-read when the hub is rebuilt (mtime changes).
const cache = globalThis as typeof globalThis & { __labManifest?: CachedManifest };

export function loadManifest(): HubManifest | null {
  if (!isPrivateDataAvailable()) return null;
  const file = hubPath('manifest.json');
  const { mtimeMs } = statSync(file);
  let cached = cache.__labManifest;
  if (!cached || cached.file !== file || cached.mtimeMs !== mtimeMs) {
    cached = { file, mtimeMs, manifest: JSON.parse(readFileSync(file, 'utf8')) as HubManifest };
    cache.__labManifest = cached;
  }
  return cached.manifest;
}

/** A source by id, or null. The id is matched against the manifest — never used as a path. */
export function getSource(id: string): HubSource | null {
  return loadManifest()?.sources.find((source) => source.id === id) ?? null;
}
