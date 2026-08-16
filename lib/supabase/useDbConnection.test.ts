import { classifyDbHost } from './useDbConnection';

describe('classifyDbHost', () => {
  it('treats the production DB tunnel host as production', () => {
    // Regression: this returned `other` ("Remote"), so the public sign-in page
    // rendered a badge printing the internal DB hostname to every real user.
    expect(classifyDbHost('db.strummy.online')).toEqual({
      kind: 'prod',
      label: 'Production',
      host: 'db.strummy.online',
    });
  });

  it('treats hosted Supabase as production', () => {
    expect(classifyDbHost('abcdefgh.supabase.co').kind).toBe('prod');
  });

  it('classifies LAN and loopback hosts as development', () => {
    expect(classifyDbHost('192.168.1.75:55321').kind).toBe('dev');
    expect(classifyDbHost('127.0.0.1:54321').kind).toBe('dev');
  });

  it('honours the isLocal flag regardless of host shape', () => {
    expect(classifyDbHost('db.strummy.online', true).kind).toBe('dev');
  });

  it('classifies preview deployments as preview', () => {
    expect(classifyDbHost('some-branch.vercel.app').kind).toBe('preview');
  });

  it('falls back to other for genuinely unknown hosts', () => {
    expect(classifyDbHost('db.example.com')).toEqual({
      kind: 'other',
      label: 'Remote',
      host: 'db.example.com',
    });
  });

  it('does not match a lookalike domain that merely ends in our name', () => {
    expect(classifyDbHost('notstrummy.online').kind).toBe('other');
  });
});
