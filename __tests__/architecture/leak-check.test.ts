import { readFileSync } from 'fs';

import { DERIVED_TABLES, formatLeaks, watchedTables } from '@/tests/helpers/leak-check';

// The leak check reads its table list from the generated types. If their
// layout changes and the parser finds nothing, the check passes on every run
// while watching no table at all — this test is what notices.
describe('leak check table list', () => {
  const watched = watchedTables();
  const names = watched.map((table) => table.name);

  it('watches the tables specs create rows in', () => {
    for (const table of [
      'songs',
      'lessons',
      'assignments',
      'profiles',
      'api_keys',
      'teacher_leads',
    ]) {
      expect(names).toContain(table);
    }
    expect(watched.length).toBeGreaterThan(30);
  });

  it('labels rows with a column a person can recognise', () => {
    expect(watched.find((table) => table.name === 'songs')?.label).toBe('title');
    expect(watched.find((table) => table.name === 'profiles')?.label).toBe('email');
  });

  it('leaves out logs written as a side effect', () => {
    expect(names.some((name) => name.startsWith('audit_log'))).toBe(false);
    for (const table of DERIVED_TABLES) expect(names).not.toContain(table);
  });

  it('every derived table exists, so a renamed one cannot hide a real table', () => {
    const source = readFileSync('database.types.ts', 'utf8');
    for (const table of DERIVED_TABLES) expect(source).toContain(`      ${table}: {`);
  });

  it('prints the table, the count and a sample', () => {
    const text = formatLeaks([
      { table: 'songs', count: 3, rows: [{ id: 'a', label: 'E2E Song' }] },
    ]);
    expect(text).toContain('songs: 3');
    expect(text).toContain('a  E2E Song');
    expect(text).toContain('and 2 more');
  });
});
