import { parseArgs } from '../2026-11-song-suggestions';

describe('song suggestions script arguments', () => {
  it('reads one field or all of them, the model, a dry run or a commit', () => {
    expect(parseArgs(['--field', 'all', '--model', 'local', '--commit', '--remote'])).toEqual({
      fields: ['category', 'level', 'author'],
      model: 'local',
      limit: Infinity,
      commit: true,
      remote: true,
    });
    expect(
      parseArgs(['--field', 'level', '--model', 'claude', '--dry-run', '--limit', '5'])
    ).toMatchObject({
      fields: ['level'],
      limit: 5,
      commit: false,
    });
  });

  it('refuses an unknown field or model, and needs exactly one of --dry-run and --commit', () => {
    expect(parseArgs(['--field', 'tempo', '--model', 'claude', '--dry-run'])).toBeNull();
    expect(parseArgs(['--field', 'all', '--model', 'gpt', '--dry-run'])).toBeNull();
    expect(parseArgs(['--field', 'all', '--model', 'claude'])).toBeNull();
    expect(parseArgs(['--field', 'all', '--model', 'claude', '--dry-run', '--commit'])).toBeNull();
  });
});
