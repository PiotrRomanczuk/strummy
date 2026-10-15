import { pickStudentsToInvite } from '../teacher-invite-queries';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const shadow = (name: string, email: string | null = `${name.toLowerCase()}@x.pl`) => ({
  full_name: name,
  is_shadow: true,
  invite_email: email,
});

describe('pickStudentsToInvite', () => {
  it('lists a booked (shadow) student once, with their first lesson date', () => {
    const rows = [
      { student_id: 's1', scheduled_at: '2026-10-20T17:30:00Z', profiles: shadow('Ola') },
      { student_id: 's1', scheduled_at: '2026-10-13T17:30:00Z', profiles: [shadow('Ola')] },
    ];
    expect(pickStudentsToInvite(rows)).toEqual([
      { studentId: 's1', name: 'Ola', email: 'ola@x.pl', firstLessonAt: '2026-10-13T17:30:00Z' },
    ]);
  });

  it('skips students who already have an account or no email to invite', () => {
    const rows = [
      { student_id: 's1', scheduled_at: '2026-10-13T17:30:00Z', profiles: { ...shadow('Ola'), is_shadow: false } },
      { student_id: 's2', scheduled_at: '2026-10-13T18:30:00Z', profiles: shadow('Ewa', null) },
      { student_id: 's3', scheduled_at: '2026-10-13T19:30:00Z', profiles: null },
    ];
    expect(pickStudentsToInvite(rows)).toEqual([]);
  });

  it('puts the most recent first lesson on top', () => {
    const rows = [
      { student_id: 's1', scheduled_at: '2026-10-06T17:30:00Z', profiles: shadow('Ola') },
      { student_id: 's2', scheduled_at: '2026-10-14T17:30:00Z', profiles: shadow('Ewa') },
    ];
    expect(pickStudentsToInvite(rows).map((s) => s.studentId)).toEqual(['s2', 's1']);
  });
});
