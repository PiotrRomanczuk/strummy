// Who a policy lets through, as short labels for the RLS matrix in the
// blueprint dashboard. Read from the policy's expressions by the helpers this
// schema uses (public.is_admin(), is_teacher(), current_profile_id() — see
// .claude/rules/migrations.md). A rule none of these patterns explains is
// labelled "rule"; the dashboard shows the expression itself on hover, so a
// label is never the only evidence.

const CMDS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

/** `( SELECT current_profile_id() AS current_profile_id)` → `current_profile_id()`. */
const unwrap = (expr) =>
  (expr ?? '')
    .replace(/\(\s*select\s+(\w+\(\))\s+as\s+\w+\s*\)/gi, '$1')
    .replace(/auth\.uid\(\)/gi, 'auth_uid()')
    .toLowerCase();

export function whoOf(policy) {
  const roles = policy.roles ?? [];
  if (roles.length && roles.every((r) => r === 'service_role')) return ['service role'];
  const expr = `${unwrap(policy.using)} ${unwrap(policy.check)}`.trim();
  const who = new Set();
  if (/\bis_admin(_or_teacher)?\(\)/.test(expr)) who.add('admin');
  if (/\bis_(admin_or_)?teacher\(\)/.test(expr)) who.add('teacher');
  for (const m of expr.matchAll(/(\w+)\s*=\s*(?:current_profile_id|auth_uid)\(\)/g))
    who.add(`own: ${m[1]}`);
  for (const m of expr.matchAll(/(?:current_profile_id|auth_uid)\(\)\s*=\s*(\w+)/g))
    who.add(`own: ${m[1]}`);
  if (/parent/.test(expr)) who.add('parent');
  if (/^(\(?true\)?\s*)+$/.test(expr)) {
    who.add(roles.includes('anon') || roles.includes('public') ? 'anyone' : 'anyone signed in');
  }
  if (!who.size) who.add('rule');
  return [...who];
}

/** table → { SELECT: [{ name, who, restrictive, expr }], INSERT: …, … }, from the catalog's policies. */
export function rlsMatrix(policies) {
  const matrix = {};
  for (const p of policies) {
    const row = (matrix[p.table] ??= Object.fromEntries(CMDS.map((c) => [c, []])));
    const applies = p.cmd === 'ALL' ? CMDS : [p.cmd];
    const cell = {
      name: p.name,
      who: whoOf(p),
      restrictive: p.permissive === 'RESTRICTIVE',
      expr: [p.using && `using ${p.using}`, p.check && `check ${p.check}`]
        .filter(Boolean)
        .join(' · '),
    };
    for (const c of applies) row[c]?.push(cell);
  }
  return matrix;
}
