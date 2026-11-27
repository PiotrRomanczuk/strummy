import { cleanSearchTerm, containsPattern, participantFilter } from './filter-pattern';

describe('cleanSearchTerm', () => {
  it('keeps an ordinary search as it is', () => {
    expect(cleanSearchTerm('John Doe')).toBe('John Doe');
    expect(cleanSearchTerm('user-123')).toBe('user-123');
    expect(cleanSearchTerm('test@example.com')).toBe('test@example.com');
  });

  it('removes characters that structure an or() filter', () => {
    expect(cleanSearchTerm('rock,title.eq.admin')).toBe('rocktitle.eq.admin');
    expect(cleanSearchTerm('(admin)')).toBe('admin');
    expect(cleanSearchTerm('a"b\\c')).toBe('abc');
  });

  it('removes LIKE wildcards, including the * alias', () => {
    expect(cleanSearchTerm('%%admin%%')).toBe('admin');
    expect(cleanSearchTerm('test_query*')).toBe('testquery');
  });

  it('trims, caps the length and returns empty when nothing is left', () => {
    expect(cleanSearchTerm('  test  ')).toBe('test');
    expect(cleanSearchTerm('a'.repeat(150))).toHaveLength(100);
    expect(cleanSearchTerm('%,()')).toBe('');
    expect(cleanSearchTerm('   ')).toBe('');
  });
});

describe('containsPattern', () => {
  it('wraps a plain search in LIKE wildcards', () => {
    expect(containsPattern('Wonderwall')).toBe('%Wonderwall%');
  });

  it('keeps dots, spaces and @ — they are safe inside a value', () => {
    expect(containsPattern('Mr. Brightside')).toBe('%Mr. Brightside%');
    expect(containsPattern('anna@example.com')).toBe('%anna@example.com%');
  });

  it('removes what would start another PostgREST condition or group', () => {
    // Without this, `x%,id.gt.0` would add the condition `id.gt.0` to the or().
    expect(containsPattern('x%,id.gt.0')).toBe('%xid.gt.0%');
    expect(containsPattern('a)or(b')).toBe('%aorb%');
    expect(containsPattern('"quoted" \\ back')).toBe('%quoted  back%');
  });

  it('removes LIKE wildcards typed by the user', () => {
    expect(containsPattern('100%_done')).toBe('%100done%');
  });
});

describe('participantFilter', () => {
  const id = '3f2b1c9e-8a47-4d1b-9c55-0a1b2c3d4e5f';

  it('builds the student-or-teacher condition for a UUID', () => {
    expect(participantFilter(id)).toBe(`student_id.eq.${id},teacher_id.eq.${id}`);
  });

  it.each(['', 'abc', `${id},id.gt.0`, `${id})`, 'x'.repeat(36)])('refuses %p', (value) => {
    expect(participantFilter(value)).toBeNull();
  });
});
