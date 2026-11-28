// Notification catalog for the blueprint dashboard (build-catalogs.mjs), read
// from the code: every value of the notification_type enum, its subject in
// English and Polish (getNotificationSubject), its template, and who sends it
// — the code that names it, plus the database functions that queue it
// (catalog-db.sql's notificationSources).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HELPERS = 'lib/services/notification-helpers.ts';
// Files that name every type without sending any: rendering, copy, gates,
// analytics. Searched: app/ and lib/ — components render, they do not send.
const NOT_A_SENDER = [
  /^lib\/email\//,
  /^lib\/services\/notification-(helpers|in-app-content)\.ts$/,
  /^lib\/services\/student-email-gate\.ts$/,
  /^app\/api\/admin\/notification-analytics\//,
  /\.test\.|__tests__|\.md$/,
];

/** type → template file, from the switch in lib/email/render-notification.ts. */
function templates(root) {
  const src = fs.readFileSync(path.join(root, 'lib/email/render-notification.ts'), 'utf8');
  const fileOf = {};
  for (const m of src.matchAll(/import \{([^}]*)\} from '\.\/templates\/([\w-]+)'/g)) {
    for (const name of m[1].split(',').map((x) => x.trim().replace(/^type\s+/, ''))) {
      fileOf[name] = `lib/email/templates/${m[2]}.ts`;
    }
  }
  const out = {};
  for (const m of src.matchAll(/case '([a-z0-9_]+)':([\s\S]*?)(?=\n\s+case '|\n\s+default:)/g)) {
    const fn = /\b(generate\w+Html)\(/.exec(m[2])?.[1];
    if (fn && fileOf[fn] && fn !== 'generateBaseEmailHtml') out[m[1]] = fileOf[fn];
  }
  return out;
}

function enumValues(root) {
  const types = fs.readFileSync(path.join(root, 'database.types.ts'), 'utf8');
  // The Constants block: `notification_type: [ "a", "b", … ]`.
  const list = /notification_type: \[([^\]]*)\]/.exec(types)?.[1] ?? '';
  return [...list.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
}

function categories(root) {
  const src = fs.readFileSync(path.join(root, 'types/notifications.ts'), 'utf8');
  const block = /NOTIFICATION_CATEGORIES = \{([\s\S]*?)\n\}/.exec(src)?.[1] ?? '';
  const byType = {};
  for (const m of block.matchAll(/(\w+): \[([^\]]*)\]/g)) {
    for (const t of m[2].matchAll(/'([a-z0-9_]+)'/g)) byType[t[1]] = m[1];
  }
  return byType;
}

/** `${data.lessonTitle || '…'}` → `{lessonTitle}`, quotes dropped. */
const literal = (s) => s.slice(1, -1).replace(/\$\{data\.(\w+)[^}]*\}/g, '{$1}');

function subjects(root) {
  const src = fs.readFileSync(path.join(root, HELPERS), 'utf8');
  const map = /const subjectMap[\s\S]*?> = \{([\s\S]*?)\n {2}\};/.exec(src)?.[1] ?? '';
  const out = {};
  const entries = map.split(/\n(?= {4}[a-z0-9_]+:)/);
  for (const entry of entries) {
    const type = /^\s*([a-z0-9_]+):/.exec(entry)?.[1];
    if (!type) continue;
    const strings = [...entry.matchAll(/'[^']*'|`[^`]*`/g)]
      .map((m) => m[0])
      .filter((s) => s !== "'pl'");
    out[type] = entry.includes("locale === 'pl'")
      ? { pl: literal(strings[0] ?? "''"), en: literal(strings[1] ?? "''") }
      : { pl: null, en: literal(strings[0] ?? "''") };
  }
  return out;
}

function senders(root, type) {
  let files = [];
  try {
    files = execFileSync('git', ['grep', '-l', '-F', `'${type}'`, '--', 'app', 'lib'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    // git grep exits 1 when nothing matches
  }
  return files.filter((f) => !NOT_A_SENDER.some((re) => re.test(f))).sort();
}

export function notificationCatalog(root, dbSources = {}) {
  const subjectOf = subjects(root);
  const categoryOf = categories(root);
  const templateOf = templates(root);
  return enumValues(root).map((type) => {
    const subject = subjectOf[type] ?? { pl: null, en: null };
    return {
      type,
      category: categoryOf[type] ?? 'other',
      subjectEn: subject.en,
      subjectPl: subject.pl,
      template: templateOf[type] ?? null,
      sentFrom: senders(root, type),
      queuedByDb: dbSources[type] ?? [],
    };
  });
}
