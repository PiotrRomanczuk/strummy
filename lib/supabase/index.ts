// Compatibility layer for components importing from @/lib/supabase
// This file re-exports the browser client with the 'supabase' name
import { createClient } from './client';

// Lazy singleton - avoids calling createClient() at module evaluation time,
// which crashes during Vercel build when env vars are unavailable.
let _supabase: ReturnType<typeof createClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    if (!_supabase) {
      _supabase = createClient();
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});

// Also export the factory function
export { createClient };
export { createClient as createBrowserClient };

// Re-export types for compatibility
export type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database.types';
export type { Tables as InsertTables } from '@/types/database.types';
