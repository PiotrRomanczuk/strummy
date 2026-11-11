import { setStudentFeature } from '../student-features';

const mockRoles = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: () => mockRoles() }));

const mockUpsert = jest.fn();
const mockEq = jest.fn();
const deleteChain = { eq: mockEq };
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ upsert: mockUpsert, delete: () => deleteChain }),
  }),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const STUDENT = '11111111-1111-4111-8111-111111111111';
const input = (isEnabled: boolean) => ({ studentId: STUDENT, feature: 'song-harmony', isEnabled });
const staff = { user: { id: 'u1' }, profileId: 'p1', isAdmin: false, isTeacher: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockRoles.mockResolvedValue({ ...staff, isDevelopment: false });
  mockUpsert.mockResolvedValue({ error: null });
  mockEq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: null });
});

describe('setStudentFeature', () => {
  it('records who turned the feature on', async () => {
    await expect(setStudentFeature(input(true))).resolves.toEqual({});
    expect(mockUpsert).toHaveBeenCalledWith(
      { student_id: STUDENT, feature_key: 'song-harmony', enabled_by: 'p1' },
      expect.anything()
    );
  });

  it('removes the row to turn it off', async () => {
    await expect(setStudentFeature(input(false))).resolves.toEqual({});
    expect(mockEq).toHaveBeenCalledWith('student_id', STUDENT);
    expect(mockEq).toHaveBeenCalledWith('feature_key', 'song-harmony');
  });

  it('refuses a student', async () => {
    mockRoles.mockResolvedValue({ ...staff, isTeacher: false, isStudent: true });
    await expect(setStudentFeature(input(true))).resolves.toEqual({ error: 'Forbidden' });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('refuses a signed-out caller', async () => {
    mockRoles.mockResolvedValue({ user: null });
    await expect(setStudentFeature(input(true))).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('refuses a feature that is not in the catalogue', async () => {
    await expect(
      setStudentFeature({ studentId: STUDENT, feature: 'nope', isEnabled: true })
    ).resolves.toEqual({ error: 'Invalid input' });
  });

  it('reports a database failure', async () => {
    mockUpsert.mockResolvedValue({ error: { code: '42501' } });
    await expect(setStudentFeature(input(true))).resolves.toEqual({ error: 'Could not save' });
  });
});
