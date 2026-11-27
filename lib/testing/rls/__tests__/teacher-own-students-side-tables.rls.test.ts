/**
 * RLS acceptance tests for migration 20261127140000: in the per-student side
 * tables a teacher reaches only the students they teach (a non-deleted lesson
 * together), an admin reaches everyone.
 *
 * Fixture: teacher A teaches student A1, teacher B teaches student B1. Each
 * table gets one row for A1 and one for B1, deleted by id in afterAll.
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedRow,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

type Table =
  'chord_quiz_attempts' | 'chord_srs' | 'student_skills' | 'song_requests' | 'song_status_history';

/** A column each test may try to overwrite, and the value it was seeded with. */
const PROBE: Record<Table, string> = {
  chord_quiz_attempts: 'selected_answer',
  chord_srs: 'chord_id',
  student_skills: 'notes',
  song_requests: 'review_notes',
  song_status_history: 'notes',
};
const TABLES = Object.keys(PROBE) as Table[];
const SEEDED = 'rls-seeded';

describeIfRls('teacher sees only own students in the side tables', () => {
  let fx: TwoTeacherFixture;
  let admin: SeededUser;
  let skillIds: string[] = [];
  const rows = {} as Record<Table, { a: string; b: string }>;
  const extraSkillRows: string[] = [];

  const valuesFor = (table: Table, studentId: string, songId: string) => {
    const base = { student_id: studentId, [PROBE[table]]: SEEDED };
    if (table === 'chord_quiz_attempts') return { ...base, chord_id: 'C', is_correct: true };
    if (table === 'student_skills') return { ...base, skill_id: skillIds[0], status: 'developing' };
    if (table === 'song_requests') return { ...base, title: 'RLS side-table request' };
    if (table === 'song_status_history') return { ...base, song_id: songId, new_status: 'started' };
    return base;
  };

  const probeValue = async (table: Table, id: string) => {
    const { data } = await fx.service.from(table).select(PROBE[table]).eq('id', id).single();
    return (data as Record<string, unknown> | null)?.[PROBE[table]];
  };

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    admin = await createSignedInRlsUser(fx.service, 'admin', `side-admin-${Date.now()}`);
    const skills = await fx.service.from('skills').select('id').limit(2);
    skillIds = (skills.data ?? []).map((s: { id: string }) => s.id);
    if (skillIds.length < 2) throw new Error('need two rows in the skills catalog');
    const songId = await fx.seedSong('side-tables');
    for (const table of TABLES) {
      rows[table] = {
        a: await seedRow(fx.service, table, valuesFor(table, fx.studentA1.id, songId)),
        b: await seedRow(fx.service, table, valuesFor(table, fx.studentB1.id, songId)),
      };
    }
  }, 60_000);

  afterAll(async () => {
    if (!fx) return;
    const failures: string[] = [];
    for (const table of TABLES) {
      const ids = [rows[table]?.a, rows[table]?.b].filter(Boolean);
      if (table === 'student_skills') ids.push(...extraSkillRows);
      if (ids.length === 0) continue;
      const { error } = await fx.service.from(table).delete().in('id', ids);
      if (error) failures.push(`${table}: ${error.message}`);
    }
    if (admin) {
      const { error } = await fx.service.auth.admin.deleteUser(admin.userId);
      if (error) failures.push(`admin: ${error.message}`);
    }
    await fx.cleanup();
    if (failures.length > 0) throw new Error(`cleanup failed:\n${failures.join('\n')}`);
  });

  const visibleIds = async (client: TwoTeacherFixture['service'], table: Table) => {
    const { data, error } = await client
      .from(table)
      .select('id')
      .in('id', [rows[table].a, rows[table].b]);
    expect(error).toBeNull();
    return (data ?? []).map((r: { id: string }) => r.id).sort();
  };

  it.each(TABLES)("%s: teacher A sees own student's row, not teacher B's", async (table) => {
    expect(await visibleIds(fx.teacherA.client, table)).toEqual([rows[table].a]);
    expect(await visibleIds(fx.teacherB.client, table)).toEqual([rows[table].b]);
  });

  it.each(TABLES)('%s: admin sees both rows', async (table) => {
    expect(await visibleIds(admin.client, table)).toEqual([rows[table].a, rows[table].b].sort());
  });

  it.each(TABLES)(
    "%s: teacher A cannot change or delete teacher B's student's row",
    async (table) => {
      await fx.teacherA.client
        .from(table)
        .update({ [PROBE[table]]: 'overwritten' })
        .eq('id', rows[table].b);
      await fx.teacherA.client.from(table).delete().eq('id', rows[table].b);
      expect(await probeValue(table, rows[table].b)).toBe(SEEDED);
    }
  );

  it("student_skills: teacher A writes own student, cannot insert for teacher B's student", async () => {
    const own = await fx.teacherA.client
      .from('student_skills')
      .update({ notes: 'assessed' })
      .eq('id', rows.student_skills.a)
      .select('id');
    expect(own.data).toHaveLength(1);
    await fx.service
      .from('student_skills')
      .update({ notes: SEEDED })
      .eq('id', rows.student_skills.a);

    const foreign = await fx.teacherA.client
      .from('student_skills')
      .insert({ student_id: fx.studentB1.id, skill_id: skillIds[1], status: 'developing' })
      .select('id');
    expect(foreign.error).not.toBeNull();
    extraSkillRows.push(...(foreign.data ?? []).map((r: { id: string }) => r.id));
  });

  it("song_requests: teacher A reviews own student's request only", async () => {
    const own = await fx.teacherA.client
      .from('song_requests')
      .update({ review_notes: 'ok' })
      .eq('id', rows.song_requests.a)
      .select('id');
    expect(own.data).toHaveLength(1);
    await fx.service
      .from('song_requests')
      .update({ review_notes: SEEDED })
      .eq('id', rows.song_requests.a);
  });

  it('students still see their own rows', async () => {
    for (const table of TABLES) {
      expect(await visibleIds(fx.studentA1.client, table)).toEqual([rows[table].a]);
    }
  });
});
