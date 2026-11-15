/**
 * Prints the StrummyTest anonymisation SQL to stdout.
 *
 *   npm run test-stack:anonymize-sql > anonymize.sql
 *   psql -v test_password="$(secret strummy-test-users)" -f anonymize.sql
 *
 * Run from the repository root (the refresh script on uwh does).
 */
import { readFileSync } from 'node:fs';
import { buildAnonymizeSql, type Rules } from './anonymize';

const dir = 'scripts/test-stack';
const rules = JSON.parse(readFileSync(`${dir}/anonymize.rules.json`, 'utf8')) as Rules;
const authSql = readFileSync(`${dir}/anonymize-auth.sql`, 'utf8');
process.stdout.write(buildAnonymizeSql(rules, authSql));
