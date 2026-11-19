-- The database half of the blueprint catalogs (scripts/docs/build-catalogs.mjs):
-- triggers, RLS policies, which tables have RLS and which database functions
-- queue each notification type, as one JSON document.
-- Run against a database rebuilt from supabase/migrations (refresh-catalog-db.sh),
-- so the catalog describes the branch, not a live stack that may have drifted.
-- Read-only: catalog queries only. psql -At prints the document on one line.
with rels as (
  select c.oid, c.relname::text as name, c.relkind, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
trigger_rows as (
  select r.name as "table",
         t.tgname::text as name,
         p.proname::text as function,
         -- timing and events, as written in the definition
         substring(pg_get_triggerdef(t.oid) from '((?:BEFORE|AFTER|INSTEAD OF) .*?) ON ') as "when",
         case when t.tgtype & 1 = 1 then 'row' else 'statement' end as "level",
         -- tables the trigger function writes, read from its source
         (select coalesce(json_agg(distinct m[3] order by m[3]), '[]'::json)
            from regexp_matches(p.prosrc,
              '(insert\s+into|update|delete\s+from)\s+(public\.)?([a-z_][a-z0-9_]*)', 'gi') as m
           where lower(m[3]) not in ('of', 'set', 'skip', 'nowait', 'only')) as writes
  from pg_trigger t
  join rels r on r.oid = t.tgrelid
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal
),
policy_rows as (
  select tablename::text as "table", policyname::text as name, cmd::text as cmd,
         permissive::text as permissive, roles::text[] as roles,
         qual as using, with_check as "check"
  from pg_policies
  where schemaname = 'public'
)
-- Database functions that name a notification type: the triggers and RPCs
-- that queue it, which the code half of the catalog cannot see.
notification_sources as (
  select e.enumlabel::text as type, json_agg(distinct p.proname::text order by p.proname::text) as functions
  from pg_enum e
  join pg_type ty on ty.oid = e.enumtypid and ty.typname = 'notification_type'
  join pg_proc p on p.prosrc like '%''' || e.enumlabel || '''%'
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  group by e.enumlabel
)
select json_build_object(
  'tables', (select json_agg(json_build_object('name', name, 'rls', relrowsecurity,
                                               'forced', relforcerowsecurity) order by name) from rels),
  'triggers', (select coalesce(json_agg(row_to_json(t) order by t."table", t.name), '[]'::json) from trigger_rows t),
  'policies', (select coalesce(json_agg(row_to_json(p) order by p."table", p.name), '[]'::json) from policy_rows p),
  'notificationSources', (select coalesce(json_object_agg(type, functions), '{}'::json) from notification_sources)
);
