-- One row per object in the public schema, for backend-changes.mjs:
--   kind <TAB> key <TAB> signature <TAB> detail
-- Two databases' inventories are compared by (kind, key): a key on one side
-- only is added or dropped, a different signature is a change. `detail` is
-- what a person reads (a trigger's or policy's definition); whitespace is
-- collapsed so every object stays on one line. Where the server's own
-- deparse can differ for the same object (CHECK casts, see normalize() in
-- scripts/e2e-remote/schema-dump.lib.sh) the signature is left empty and
-- backend-changes.mjs compares the normalised detail instead.
--
-- Read-only: catalog queries only. Run with psql -At -F '<TAB>'.
with rels as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
),
inventory(kind, key, sig, detail) as (
  -- ::text — otherwise the union takes `name` from this first branch and cuts
  -- every key to 63 bytes (three constraints of one table became one key).
  select case when relkind in ('v', 'm') then 'view' else 'table' end,
         relname::text,
         case when relkind in ('v', 'm') then md5(pg_get_viewdef(oid)) else relrowsecurity::text end,
         case when relrowsecurity then 'rls' else '' end
  from rels

  union all
  select 'column', r.relname || '.' || a.attname,
         format_type(a.atttypid, a.atttypmod)
           || case when a.attnotnull then ' not null' else '' end
           || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), ''),
         ''
  from pg_attribute a
  join rels r on r.oid = a.attrelid and r.relkind in ('r', 'p')
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attnum > 0 and not a.attisdropped

  union all
  select 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         md5(pg_get_functiondef(p.oid)),
         case when p.prosecdef then 'security definer' else '' end
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
    -- functions an extension installed into public are not ours
    and not exists (select 1 from pg_depend dp where dp.objid = p.oid and dp.deptype = 'e')

  union all
  select 'trigger', r.relname || '.' || t.tgname, md5(pg_get_triggerdef(t.oid)), pg_get_triggerdef(t.oid)
  from pg_trigger t
  join rels r on r.oid = t.tgrelid
  where not t.tgisinternal

  union all
  select 'policy', tablename || '.' || policyname,
         permissive,
         concat_ws(' ', cmd, 'for ' || array_to_string(roles, ', '),
                   'using (' || qual || ')', 'with check (' || with_check || ')')
  from pg_policies
  where schemaname = 'public'

  union all
  select 'index', r.relname || '.' || ic.relname, '', pg_get_indexdef(i.indexrelid)
  from pg_index i
  join pg_class ic on ic.oid = i.indexrelid
  join rels r on r.oid = i.indrelid
  -- indexes behind a constraint are reported as the constraint
  where not exists (select 1 from pg_constraint co where co.conindid = i.indexrelid)

  union all
  select 'constraint', r.relname || '.' || co.conname, '', pg_get_constraintdef(co.oid)
  from pg_constraint co
  join rels r on r.oid = co.conrelid

  union all
  select 'enum', t.typname, string_agg(e.enumlabel, ', ' order by e.enumsortorder), ''
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname
)
select kind, key, sig, regexp_replace(detail, '\s+', ' ', 'g')
from inventory
order by kind, key;
