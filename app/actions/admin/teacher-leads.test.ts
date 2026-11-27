/**
 * @jest-environment node
 */
import { revalidatePath } from 'next/cache';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';

import { setTeacherLeadReplied } from './teacher-leads';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));

const LEAD_ID = '00000000-0000-4000-8000-000000000001';

describe('setTeacherLeadReplied', () => {
  const select = jest.fn();
  const eq = jest.fn(() => ({ select }));
  const update = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ update }));

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue({ from });
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ isAdmin: true, isDevelopment: false });
    select.mockResolvedValue({ data: [{ id: LEAD_ID }], error: null });
  });

  it('sets status contacted for "replied" and revalidates the list', async () => {
    await expect(setTeacherLeadReplied({ id: LEAD_ID, isReplied: true })).resolves.toEqual({
      success: true,
    });
    expect(from).toHaveBeenCalledWith('teacher_leads');
    expect(update).toHaveBeenCalledWith({ status: 'contacted' });
    expect(eq).toHaveBeenCalledWith('id', LEAD_ID);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/admin/teacher-leads');
  });

  it('puts a lead back to new on undo', async () => {
    await setTeacherLeadReplied({ id: LEAD_ID, isReplied: false });
    expect(update).toHaveBeenCalledWith({ status: 'new' });
  });

  it('rejects malformed input before touching the session or the database', async () => {
    await expect(setTeacherLeadReplied({ id: 'not-a-uuid', isReplied: true })).resolves.toEqual({
      success: false,
      error: 'invalid',
    });
    await expect(setTeacherLeadReplied(null)).resolves.toMatchObject({ success: false });
    expect(getUserWithRolesSSR).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('refuses a non-admin without writing', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ isAdmin: false, isDevelopment: false });
    await expect(setTeacherLeadReplied({ id: LEAD_ID, isReplied: true })).resolves.toEqual({
      success: false,
      error: 'forbidden',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('reports notFound when RLS or a deleted row leaves nothing updated', async () => {
    select.mockResolvedValue({ data: [], error: null });
    await expect(setTeacherLeadReplied({ id: LEAD_ID, isReplied: true })).resolves.toEqual({
      success: false,
      error: 'notFound',
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('reports failed on a database error', async () => {
    select.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(setTeacherLeadReplied({ id: LEAD_ID, isReplied: true })).resolves.toEqual({
      success: false,
      error: 'failed',
    });
  });
});
