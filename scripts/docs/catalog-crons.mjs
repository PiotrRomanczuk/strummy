// Cron catalog for the blueprint dashboard (build-catalogs.mjs), read from the
// code: the one Vercel cron is the dispatcher, and the dispatcher's job lists
// are the schedule. What each job does comes from its route's header comment,
// else from the comment beside the job, else from the functions it calls.
import fs from 'node:fs';
import path from 'node:path';

const DISPATCHER = 'app/api/cron/dispatcher/route.ts';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// A route header's scheduling claims are kept apart from what the job does:
// the schedule is the dispatcher's, and headers written for the old per-route
// crons still claim theirs ("Runs every Monday at 9 AM UTC").
const TITLE_LINE = /^(GET \/api\/|cron job:)/i;
const TIME_CLAIM = /\b\d{1,2}(:\d\d)?\s?(AM|PM)\b|\bevery \d+ minutes\b|\bevery hour\b|^Schedule:/i;

/** The header's description (two sentences) and its scheduling claims. */
export function headerComment(source) {
  const block = /\/\*\*([\s\S]*?)\*\//.exec(source)?.[1] ?? '';
  const lines = block
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter((l) => l && !TITLE_LINE.test(l));
  // A line opening with "Runs"/"Schedule:" starts a sentence even without a full stop.
  const text = lines.reduce(
    (acc, l) =>
      /^(runs\b|schedule:)/i.test(l) && acc && !/[.!?:]$/.test(acc)
        ? `${acc}. ${l}`
        : `${acc} ${l}`,
    ''
  );
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    what: sentences
      .filter((x) => !/^schedule:/i.test(x))
      .slice(0, 2)
      .join(' '),
    claims: sentences.filter((x) => TIME_CLAIM.test(x)).join(' '),
  };
}

function envGates(source) {
  const names = [...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
  return [...new Set(names)].filter((n) => n !== 'CRON_SECRET').sort();
}

/** `{ name: '…', fn: … }` entries of a block of the dispatcher, with their comments. */
function jobsIn(block) {
  const jobs = [];
  const re = /\{\s*((?:\/\/[^\n]*\n\s*)*)name:\s*'([^']+)',\s*fn:([\s\S]*?)\n\s{0,6}\}/g;
  for (const m of block.matchAll(re)) {
    const comment = m[1]
      .replace(/\/\/\s?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const calls = [...m[3].matchAll(/\b([a-z][A-Za-z]+)\(/g)]
      .map((c) => c[1])
      .filter((c) => !['then', 'json', 'async', 'fn'].includes(c));
    jobs.push({ name: m[2], comment, calls: [...new Set(calls)] });
  }
  return jobs;
}

function describe(root, job, when) {
  const route = path.join('app/api/cron', job.name, 'route.ts');
  const source = fs.existsSync(path.join(root, route))
    ? fs.readFileSync(path.join(root, route), 'utf8')
    : '';
  const header = source ? headerComment(source) : { what: '', claims: '' };
  const what =
    header.what || job.comment || (job.calls.length ? `Calls ${job.calls.join(', ')}.` : '');
  return {
    name: job.name,
    when,
    what,
    file: source ? route : DISPATCHER,
    env: source ? envGates(source) : [],
    headerSays: header.claims,
  };
}

export function cronCatalog(root) {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const cron = (vercel.crons ?? []).find((c) => c.path === '/api/cron/dispatcher');
  const [min, hour] = (cron?.schedule ?? '? ?').split(' ');
  const at = `${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`;
  const src = fs.readFileSync(path.join(root, DISPATCHER), 'utf8');
  const section = (start, end) =>
    src.slice(src.indexOf(start), src.indexOf(end, src.indexOf(start)));

  const daily = jobsIn(section('function buildDailyJobs', '\n}\n')).map((j) =>
    describe(root, j, `daily ${at}`)
  );
  const queue = jobsIn(section('const queueJob', '\n};\n')).map((j) =>
    describe(root, j, `daily ${at}, after the jobs above`)
  );
  const weekly = [];
  const weeklySrc = section('function buildWeeklyJobs', '\n}\n');
  for (const m of weeklySrc.matchAll(/dayOfWeek === (\d)\)\s*\{([\s\S]*?)\n {2}\}/g)) {
    for (const j of jobsIn(m[2])) weekly.push(describe(root, j, `${DAYS[Number(m[1])]} ${at}`));
  }
  return { schedule: cron?.schedule ?? null, jobs: [...daily, ...weekly, ...queue] };
}
