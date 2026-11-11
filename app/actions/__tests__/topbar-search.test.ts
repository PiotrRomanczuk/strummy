import { searchTopbar } from '../topbar-search';

const mockRoles = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: () => mockRoles() }));

const mockFrom = jest.fn();
const mockOr = jest.fn();
const mockIlike = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: mockFrom }) }));

function chain(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'is', 'eq', 'order']) query[method] = () => query;
  query.or = (filter: string) => (mockOr(filter), query);
  query.ilike = (column: string, pattern: string) => (mockIlike(column, pattern), query);
  query.limit = async () => result;
  return query;
}

const songs = [{ id: 's1', title: 'Wonderwall', author: 'Oasis' }];
const students = [{ id: 'p1', full_name: 'Ania' }];

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation((table: string) =>
    chain({ data: table === 'songs' ? songs : students, error: null })
  );
  mockRoles.mockResolvedValue({ user: { id: 'u1' }, isAdmin: false, isTeacher: true });
});

describe('searchTopbar', () => {
  it('returns songs and students to a teacher', async () => {
    await expect(searchTopbar('won')).resolves.toEqual({
      songs,
      students: [{ id: 'p1', name: 'Ania' }],
    });
  });

  it('never queries profiles for a student', async () => {
    mockRoles.mockResolvedValue({ user: { id: 'u1' }, isAdmin: false, isTeacher: false });

    await expect(searchTopbar('won')).resolves.toEqual({ songs, students: [] });
    expect(mockFrom).not.toHaveBeenCalledWith('profiles');
  });

  it('returns nothing to a signed-out caller', async () => {
    mockRoles.mockResolvedValue({ user: null });

    await expect(searchTopbar('won')).resolves.toEqual({ songs: [], students: [] });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('ignores a query shorter than two characters', async () => {
    await expect(searchTopbar('w')).resolves.toEqual({ songs: [], students: [] });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('strips filter syntax and wildcards from the query', async () => {
    await searchTopbar('a%b,(c)_d');

    expect(mockOr).toHaveBeenCalledWith('title.ilike.%abcd%,author.ilike.%abcd%');
    expect(mockIlike).toHaveBeenCalledWith('full_name', '%abcd%');
  });

  it('still returns songs when the student query fails', async () => {
    mockFrom.mockImplementation((table: string) =>
      chain(table === 'songs' ? { data: songs, error: null } : { data: null, error: { code: 'x' } })
    );

    await expect(searchTopbar('won')).resolves.toEqual({ songs, students: [] });
  });
});
