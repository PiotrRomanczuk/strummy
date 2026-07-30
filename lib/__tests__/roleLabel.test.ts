import enMessages from '@/messages/en.json';
import { resolveRoleLabel } from '@/lib/roleLabel';

const t = (key: string) => enMessages.Roles[key as keyof typeof enMessages.Roles];

describe('resolveRoleLabel', () => {
  it('joins every held role instead of picking one', () => {
    expect(resolveRoleLabel({ isAdmin: true, isTeacher: true, isStudent: false }, t)).toBe(
      'Admin · Teacher'
    );
  });

  it('returns the single role when only one is held', () => {
    expect(resolveRoleLabel({ isAdmin: false, isTeacher: false, isStudent: true }, t)).toBe(
      'Student'
    );
  });

  it('falls back to "User" when no role is held', () => {
    expect(resolveRoleLabel({ isAdmin: false, isTeacher: false, isStudent: false }, t)).toBe(
      'User'
    );
  });
});
