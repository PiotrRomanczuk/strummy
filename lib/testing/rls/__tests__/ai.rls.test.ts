/**
 * RLS-real coverage for the AI tables (#1216): `ai_conversations`, `ai_messages`, `ai_generations`.
 *
 * Policies (baseline, `20260727130000_legacy_policies_profile_space.sql`; columns renamed to
 * `profile_id` in `20260731143000_rename_profile_fk_columns.sql`):
 *   - a conversation and its messages belong to one profile: nobody else reads or writes them;
 *   - a generation belongs to one profile; admins also read and delete everyone's.
 *
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

describeIfRls('AI conversations and generations RLS', () => {
  let fx: TwoTeacherFixture;
  let admin: SeededUser;
  let conversationId: string;
  let generationId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    admin = await createSignedInRlsUser(fx.service, 'admin', `ai-${Date.now()}`);
  }, 60_000);

  afterAll(async () => {
    // Conversations, messages and generations cascade from their profile; delete ours explicitly
    // anyway so nothing rides on the cascade.
    if (fx) {
      const owners = [fx.teacherA.id, fx.teacherB.id, fx.studentA1.id, fx.studentB1.id];
      const conversations = await fx.service
        .from('ai_conversations')
        .delete()
        .in('profile_id', owners);
      const generations = await fx.service.from('ai_generations').delete().in('profile_id', owners);
      const failed = conversations.error ?? generations.error;
      if (failed) throw new Error(`AI cleanup failed: ${failed.message}`);
    }
    if (admin?.userId) {
      const { error } = await fx.service.auth.admin.deleteUser(admin.userId);
      if (error) throw new Error(`admin cleanup failed: ${error.message}`);
    }
    await fx?.cleanup();
  });

  describe('ai_conversations and ai_messages', () => {
    it('a user starts a conversation and writes into it', async () => {
      const conversation = await fx.teacherA.client
        .from('ai_conversations')
        .insert({ profile_id: fx.teacherA.id, model_id: 'rls-model', title: 'RLS chat' })
        .select('id')
        .single();
      expect(conversation.error).toBeNull();
      conversationId = conversation.data!.id;
      const message = await fx.teacherA.client
        .from('ai_messages')
        .insert({ conversation_id: conversationId, role: 'user', content: 'hello' });
      expect(message.error).toBeNull();
    });

    it('another teacher sees neither the conversation nor its messages', async () => {
      const conversations = await fx.teacherB.client
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId);
      expect(conversations.data).toEqual([]);
      const messages = await fx.teacherB.client
        .from('ai_messages')
        .select('id')
        .eq('conversation_id', conversationId);
      expect(messages.data).toEqual([]);
    });

    it("another teacher cannot write into it, rename it, or open one in the owner's name", async () => {
      const message = await fx.teacherB.client
        .from('ai_messages')
        .insert({ conversation_id: conversationId, role: 'user', content: 'injected' });
      expect(message.error).not.toBeNull();
      const rename = await fx.teacherB.client
        .from('ai_conversations')
        .update({ title: 'taken over' })
        .eq('id', conversationId)
        .select('id');
      expect(rename.data).toEqual([]);
      const forged = await fx.teacherB.client
        .from('ai_conversations')
        .insert({ profile_id: fx.teacherA.id, model_id: 'rls-model' });
      expect(forged.error).not.toBeNull();
    });

    it("a student cannot read a teacher's conversation", async () => {
      const { data } = await fx.studentA1.client
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId);
      expect(data).toEqual([]);
    });
  });

  describe('ai_generations', () => {
    const generation = (profileId: string) => ({
      profile_id: profileId,
      generation_type: 'lesson_notes' as const,
      input_params: { source: 'rls' },
      output_content: 'RLS generated notes',
    });

    it('a teacher records and reads their own generation', async () => {
      const { data, error } = await fx.teacherA.client
        .from('ai_generations')
        .insert(generation(fx.teacherA.id))
        .select('id')
        .single();
      expect(error).toBeNull();
      generationId = data!.id;
    });

    it("another teacher neither sees it nor records one in the first teacher's name", async () => {
      const read = await fx.teacherB.client
        .from('ai_generations')
        .select('id')
        .eq('id', generationId);
      expect(read.data).toEqual([]);
      const forged = await fx.teacherB.client
        .from('ai_generations')
        .insert(generation(fx.teacherA.id));
      expect(forged.error).not.toBeNull();
      const star = await fx.teacherB.client
        .from('ai_generations')
        .update({ is_starred: true })
        .eq('id', generationId)
        .select('id');
      expect(star.data).toEqual([]);
    });

    it('a student does not see it; an admin does', async () => {
      const student = await fx.studentA1.client
        .from('ai_generations')
        .select('id')
        .eq('id', generationId);
      expect(student.data).toEqual([]);
      const byAdmin = await admin.client.from('ai_generations').select('id').eq('id', generationId);
      expect(byAdmin.data).toHaveLength(1);
    });
  });
});
