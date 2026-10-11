import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/** Recent `audit_log` rows for the admin dashboard, minus timestamp-only touches. */

export type AuditRole = 'admin' | 'teacher' | 'system';

export type AuditEntry = {
  id: string;
  at: string;
  role: AuditRole;
  who: string;
  verb: string;
  object: string;
};

type Json = Record<string, unknown> | null;

const VERBS: Record<string, string> = {
  created: 'created',
  deleted: 'deleted',
  updated: 'updated',
  role_changed: 'changed the role of',
  status_changed: 'changed the status of',
};

const pick = (o: Json, keys: string[]) => {
  for (const k of keys) if (o && typeof o[k] === 'string' && o[k]) return o[k] as string;
  return null;
};

/** "lesson “Barre chords”" — the entity type plus whatever name the change carries. */
const describeObject = (entity: string, changes: Json): string => {
  const flat = { ...(changes ?? {}), ...((changes?.new as Json) ?? {}) };
  const name = pick(flat, ['title', 'full_name', 'email', 'name']);
  const label = entity.replace(/_/g, ' ');
  return name ? `${label} “${name}”` : label;
};

const isNoise = (action: string, changes: Json) => {
  if (action !== 'updated') return false;
  const keys = Object.keys((changes?.new as Json) ?? {});
  return keys.length === 0 || keys.every((k) => k === 'updated_at');
};

export async function getRecentAudit(limit = 7): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_log')
    .select(
      'id, entity_type, action, changes, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, email, is_admin)'
    )
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    logger.warn('[admin-audit] query error', { error: error.message });
    return [];
  }
  return (data ?? [])
    .filter((r) => !isNoise(r.action, r.changes as Json))
    .slice(0, limit)
    .map((r) => {
      const actor = (Array.isArray(r.actor) ? r.actor[0] : r.actor) as {
        full_name: string | null;
        email: string | null;
        is_admin: boolean;
      } | null;
      return {
        id: r.id,
        at: r.created_at,
        role: !actor ? 'system' : actor.is_admin ? 'admin' : 'teacher',
        who: actor ? (actor.full_name ?? actor.email ?? 'someone') : 'system',
        verb: VERBS[r.action] ?? r.action,
        object: describeObject(r.entity_type, r.changes as Json),
      };
    });
}
