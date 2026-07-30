import enMessages from '@/messages/en.json';
import { filterGroups, getRoleLabel, getSidebarGroups, matchesItem } from './sidebar.helpers';

describe('getSidebarGroups', () => {
  it('returns the core teacher groups (Teaching, Students) for teacher', () => {
    const ids = getSidebarGroups({ isAdmin: false, isTeacher: true, isStudent: false }).map(
      (g) => g.id
    );
    expect(ids).toEqual(['teaching', 'students', 'tools']);
  });

  it('returns the student groups (Learning, Resources, Progress) for student', () => {
    const ids = getSidebarGroups({ isAdmin: false, isTeacher: false, isStudent: true }).map(
      (g) => g.id
    );
    expect(ids).toEqual(['learning', 'resources', 'progress']);
  });

  it('admin sees the core teacher groups (admin oversees teachers)', () => {
    const ids = getSidebarGroups({ isAdmin: true, isTeacher: false, isStudent: false }).map(
      (g) => g.id
    );
    expect(ids).toEqual(['teaching', 'students', 'tools']);
  });

  it('returns no groups when no roles', () => {
    expect(getSidebarGroups({ isAdmin: false, isTeacher: false, isStudent: false })).toEqual([]);
  });

  // A parent's whole surface is the family dashboard, reached by the standing
  // Dashboard link. No list page is parent-scoped, so nav entries would open
  // empty pages — the placeholder navigation the trust pass forbids.
  it('returns no groups for a parent, whose only surface is the family dashboard', () => {
    expect(
      getSidebarGroups({ isAdmin: false, isTeacher: false, isStudent: false, isParent: true })
    ).toEqual([]);
  });

  it('a parent who also studies still gets the student groups', () => {
    const ids = getSidebarGroups({
      isAdmin: false,
      isTeacher: false,
      isStudent: true,
      isParent: true,
    }).map((g) => g.id);
    expect(ids).toEqual(['learning', 'resources', 'progress']);
  });

  // The old DEMO_HIDDEN_ITEMS list was a strict subset of the core-loop hide
  // list, so it never changed the output. Demo accounts now see exactly what
  // every other teacher sees — which is the point of a demo.
  it('demo accounts see the same sidebar as any other teacher', () => {
    const asDemo = getSidebarGroups({
      isAdmin: false,
      isTeacher: true,
      isStudent: false,
      isDemoAccount: true,
    });
    const asTeacher = getSidebarGroups({ isAdmin: false, isTeacher: true, isStudent: false });
    expect(asDemo).toEqual(asTeacher);

    const allItems = asDemo.flatMap((g) => g.items.map((i) => i.id));
    expect(allItems).toContain('skills'); // revealed 2026-07-22 (CHT-2)
    expect(allItems).not.toContain('health');
    expect(allItems).not.toContain('cohorts');
  });
});

describe('getRoleLabel', () => {
  const t = (key: string) => enMessages.Roles[key as keyof typeof enMessages.Roles];

  it.each([
    [{ isAdmin: true, isTeacher: false, isStudent: false }, 'Admin'],
    [{ isAdmin: false, isTeacher: true, isStudent: false }, 'Teacher'],
    [{ isAdmin: false, isTeacher: false, isStudent: true }, 'Student'],
    [{ isAdmin: false, isTeacher: false, isStudent: false, isParent: true }, 'Parent'],
    [{ isAdmin: false, isTeacher: false, isStudent: false }, 'User'],
  ])('returns %s for %j', (roles, expected) => {
    expect(getRoleLabel(roles, t)).toBe(expected);
  });

  it('admin wins when multiple roles set', () => {
    expect(getRoleLabel({ isAdmin: true, isTeacher: true, isStudent: false }, t)).toBe('Admin');
  });

  it('a studying parent is labelled Student, matching view-selection precedence', () => {
    expect(
      getRoleLabel({ isAdmin: false, isTeacher: false, isStudent: true, isParent: true }, t)
    ).toBe('Student');
  });
});

describe('filterGroups', () => {
  const groups = getSidebarGroups({ isAdmin: false, isTeacher: true, isStudent: false });

  it('returns all groups when query empty', () => {
    expect(filterGroups(groups, '').length).toBe(groups.length);
    expect(filterGroups(groups, '   ').length).toBe(groups.length);
  });

  it('drops groups whose items do not match', () => {
    const filtered = filterGroups(groups, 'lesson');
    const ids = filtered.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('lessons');
    expect(filtered.every((g) => g.items.length > 0)).toBe(true);
  });

  it('match is case-insensitive', () => {
    expect(filterGroups(groups, 'SONGS').length).toBeGreaterThan(0);
  });
});

describe('matchesItem', () => {
  const item = { id: 'x', label: 'Settings', icon: (() => null) as never, path: '/' };

  it('matches when query empty or substring', () => {
    expect(matchesItem(item, '')).toBe(true);
    expect(matchesItem(item, 'set')).toBe(true);
    expect(matchesItem(item, 'SETTINGS')).toBe(true);
  });

  it('does not match unrelated query', () => {
    expect(matchesItem(item, 'song')).toBe(false);
  });
});
