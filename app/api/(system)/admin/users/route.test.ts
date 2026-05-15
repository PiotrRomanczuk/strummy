import { GET } from './route';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Admin Users API', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('returns 401 if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 if not admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ role: 'student' }], error: null }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns users list if admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin1' } }, error: null });
    
    // Mock users fetch
    const usersQuery = {
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ 
          data: [{ id: 'u1', full_name: 'User 1' }], 
          error: null 
        }),
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_roles') {
        // This is tricky because we call user_roles twice.
        // First call is with .eq('user_id', user.id)
        // Second call is just .select('*')
        // We can distinguish by checking if .eq is called later or return a chainable mock
        return {
          select: jest.fn((cols) => {
            if (cols === 'role') return {
              eq: jest.fn().mockResolvedValue({ data: [{ role: 'admin' }], error: null })
            };
            return {
              // This handles the second call .select('*')
              then: (resolve: (value: { data: { user_id: string; role: string }[]; error: null }) => void) => resolve({ data: [{ user_id: 'u1', role: 'student' }], error: null })
            };
          })
        };
      }
      if (table === 'profiles') return usersQuery;
      return {};
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.users[0].is_student).toBe(true);
  });

  it('handles database error fetching users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin1' } }, error: null });
    
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [{ role: 'admin' }], error: null })
          })
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
          })
        };
      }
      return {};
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
