import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import type { TeacherLeadListItem } from '@/lib/services/teacher-leads-queries';

import { TeacherLeads } from './TeacherLeads';
import {
  pageRange,
  parseTeacherLeadsParams,
  teacherLeadsHref,
  totalPagesFor,
} from './teacher-leads.helpers';

const mockSetReplied = jest.fn();
jest.mock('@/app/actions/admin/teacher-leads', () => ({
  setTeacherLeadReplied: (...args: unknown[]) => mockSetReplied(...args),
}));
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Invented people only: this repo is public.
const lead = (over: Partial<TeacherLeadListItem>): TeacherLeadListItem => ({
  id: '00000000-0000-4000-8000-000000000001',
  created_at: '2026-11-20T10:00:00Z',
  full_name: 'Jan Testowy',
  email: 'jan@example.com',
  locale: 'pl',
  source: 'facebook',
  status: 'new',
  ...over,
});

const ALL = parseTeacherLeadsParams({});

describe('teacher-leads helpers', () => {
  it('parses page and filter, falling back to page 1 / all', () => {
    expect(parseTeacherLeadsParams({ page: '3', filter: 'unhandled' })).toEqual({
      page: 3,
      filter: 'unhandled',
    });
    expect(parseTeacherLeadsParams({ page: '-2', filter: 'bogus' })).toEqual({
      page: 1,
      filter: 'all',
    });
  });

  it('keeps defaults out of the URL and resets the page on a filter change', () => {
    const onPage3 = { page: 3, filter: 'all' as const };
    expect(teacherLeadsHref({ filter: 'unhandled' }, onPage3)).toBe(
      '/dashboard/admin/teacher-leads?filter=unhandled'
    );
    expect(teacherLeadsHref({ page: 2 }, ALL)).toBe('/dashboard/admin/teacher-leads?page=2');
  });

  it('turns a page into an inclusive row range', () => {
    expect(pageRange(1)).toEqual([0, 24]);
    expect(pageRange(3, 10)).toEqual([20, 29]);
    expect(totalPagesFor(0)).toBe(1);
    expect(totalPagesFor(26)).toBe(2);
  });
});

describe('TeacherLeads', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists each lead with its date, name, address, language and source', async () => {
    await renderServerTree(
      <TeacherLeads
        params={ALL}
        page={{
          count: 2,
          leads: [
            lead({}),
            lead({
              id: 'b',
              full_name: 'Ann Example',
              email: 'ann@example.com',
              locale: 'en',
              source: null,
              status: 'contacted',
            }),
          ],
        }}
      />
    );

    const rows = screen.getAllByTestId('teacher-lead-row');
    expect(rows).toHaveLength(2);
    const first = within(rows[0]);
    expect(first.getByText('Jan Testowy')).toBeInTheDocument();
    expect(first.getByRole('link', { name: 'jan@example.com' })).toHaveAttribute(
      'href',
      'mailto:jan@example.com'
    );
    expect(first.getByText('Polish')).toBeInTheDocument();
    expect(first.getByText('facebook')).toBeInTheDocument();
    expect(first.getByText('New')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Replied')).toBeInTheDocument();
    expect(within(rows[1]).getByText('—')).toBeInTheDocument();
  });

  it('marks the active filter and links to the unhandled view', async () => {
    await renderServerTree(<TeacherLeads params={ALL} page={{ count: 0, leads: [] }} />);
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Unhandled' })).toHaveAttribute(
      'href',
      '/dashboard/admin/teacher-leads?filter=unhandled'
    );
    expect(screen.getByText('No one has filled in the For teachers form yet.')).toBeInTheDocument();
  });

  it('says so when every lead has a reply', async () => {
    await renderServerTree(
      <TeacherLeads params={{ page: 1, filter: 'unhandled' }} page={{ count: 0, leads: [] }} />
    );
    expect(screen.getByText('Every lead has a reply.')).toBeInTheDocument();
  });

  it('paginates from the server count', async () => {
    await renderServerTree(<TeacherLeads params={ALL} page={{ count: 30, leads: [lead({})] }} />);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/dashboard/admin/teacher-leads?page=2'
    );
  });

  it('marks a lead replied through the server action and refreshes the list', async () => {
    mockSetReplied.mockResolvedValue({ success: true });
    await renderServerTree(<TeacherLeads params={ALL} page={{ count: 1, leads: [lead({})] }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark Jan Testowy as replied' }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockSetReplied).toHaveBeenCalledWith({
      id: '00000000-0000-4000-8000-000000000001',
      isReplied: true,
    });
  });
});
