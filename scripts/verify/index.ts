#!/usr/bin/env tsx
import { config as loadEnv } from 'dotenv';
import { Reporter } from './lib/reporter';

loadEnv({ path: '.env.local' });
loadEnv();

const USAGE = `
strummy verify — backend correctness CLI

Usage:
  npx tsx scripts/verify/index.ts <command> [args]

Commands:
  crud [students|lessons|songs|assignments|all]   Verify CRUD with RLS across 3 roles
  onboarding [email]                              Verify shadow → real user conversion end-to-end
  --help, -h                                      Show this message

Examples:
  npx tsx scripts/verify/index.ts crud all
  npx tsx scripts/verify/index.ts crud lessons
  npx tsx scripts/verify/index.ts onboarding test+verify@strummy.app

Env (auto-loaded from .env.local):
  NEXT_PUBLIC_SUPABASE_LOCAL_URL          (default: http://127.0.0.1:54321)
  SUPABASE_SERVICE_ROLE_KEY               (required)
  NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY     (required)
`.trim();

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return 0;
  }

  const reporter = new Reporter();

  try {
    if (command === 'crud') {
      const { runCrud } = await import('./crud/runner');
      await runCrud(reporter, rest[0] || 'all');
    } else if (command === 'onboarding') {
      const { runOnboarding } = await import('./onboarding');
      const email = rest[0] || `verify+${Date.now()}@strummy.test`;
      await runOnboarding(reporter, email);
    } else {
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      return 2;
    }
  } catch (err) {
    console.error(`\nFatal: ${err instanceof Error ? err.message : err}`);
    return 1;
  }

  reporter.summary();
  return reporter.exitCode();
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
