type Roles = { isAdmin: boolean; isTeacher: boolean; isStudent: boolean };

/**
 * Joins every role a user holds instead of picking one — a user with both
 * isAdmin and isTeacher must see "Admin · Teacher", not just "Admin".
 */
export function resolveRoleLabel(
  { isAdmin, isTeacher, isStudent }: Roles,
  t: (key: string) => string
): string {
  const roles: string[] = [];
  if (isAdmin) roles.push(t('admin'));
  if (isTeacher) roles.push(t('teacher'));
  if (isStudent) roles.push(t('student'));
  return roles.length > 0 ? roles.join(' · ') : t('user');
}
