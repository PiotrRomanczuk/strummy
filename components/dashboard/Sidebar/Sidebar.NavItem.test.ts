import { isActive } from './Sidebar.NavItem';

describe('isActive — sibling specificity (AIA-4)', () => {
  const NAV = ['/dashboard', '/dashboard/ai', '/dashboard/ai/chat', '/dashboard/lessons'];

  it('marks only the most specific match active', () => {
    // Both /dashboard/ai and /dashboard/ai/chat prefix-match this URL; only the
    // longer one should win, otherwise two nav items render as active at once.
    expect(isActive('/dashboard/ai/chat', '/dashboard/ai/chat', false, NAV)).toBe(true);
    expect(isActive('/dashboard/ai/chat', '/dashboard/ai', false, NAV)).toBe(false);
  });

  it('still prefix-matches when no deeper sibling exists', () => {
    expect(isActive('/dashboard/lessons/123', '/dashboard/lessons', false, NAV)).toBe(true);
  });

  it('keeps the parent active on its own route', () => {
    expect(isActive('/dashboard/ai', '/dashboard/ai', false, NAV)).toBe(true);
  });

  it('treats the home item as exact-match only', () => {
    expect(isActive('/dashboard/lessons', '/dashboard', true, NAV)).toBe(false);
    expect(isActive('/dashboard', '/dashboard', true, NAV)).toBe(true);
  });
});
