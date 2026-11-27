/**
 * The course page in Polish — the labels that were English next to a translated
 * course list: back link, chapter count, Published, Edit, Chapter, the level.
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { __setMockLocale } from '@/lib/testing/__mocks__/next-intl-server';
import { renderServerTree } from '@/lib/testing/intl-test-utils';
import CourseDetailPage from './page';

const mockGetCourse = jest.fn();
jest.mock('@/app/dashboard/theory/actions', () => ({
  getTheoryCourse: (id: string) => mockGetCourse(id),
  getCourseAccess: jest.fn(async () => []),
  getStudentsList: jest.fn(async () => []),
}));
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn(async () => ({ isAdmin: false, isTeacher: true })),
}));
jest.mock('@/components/theory', () => ({ CourseAccessManager: () => null }));
jest.mock('next/navigation', () => ({ notFound: jest.fn() }));

const course = (lessonCount: number, isPublished: boolean) => ({
  title: 'Podstawy harmonii',
  description: null,
  level: 'beginner',
  is_published: isPublished,
  lessons: Array.from({ length: lessonCount }, (_, i) => ({
    id: `l-${i}`,
    title: `Rozdział ${i + 1}`,
    excerpt: null,
    is_published: true,
    sort_order: i,
  })),
});

const renderPage = async () =>
  renderServerTree(await CourseDetailPage({ params: Promise.resolve({ courseId: 'c-1' }) }));

beforeEach(() => __setMockLocale('pl'));
afterEach(() => __setMockLocale('en'));

describe('course detail page (pl)', () => {
  it('translates the header, counts and teacher actions', async () => {
    mockGetCourse.mockResolvedValue(course(8, true));
    await renderPage();
    expect(screen.getByText('← Teoria')).toBeInTheDocument();
    expect(screen.getByText('8 rozdziałów')).toBeInTheDocument();
    expect(screen.getByText('Opublikowany')).toBeInTheDocument();
    expect(screen.getByText('Edytuj')).toBeInTheDocument();
    expect(screen.getByText('Rozdział')).toBeInTheDocument();
    expect(screen.getByText('Początkujący')).toBeInTheDocument();
  });

  it('shows the Polish draft label and empty state', async () => {
    mockGetCourse.mockResolvedValue(course(0, false));
    await renderPage();
    expect(screen.getByText('Szkic')).toBeInTheDocument();
    expect(screen.getByText('Brak rozdziałów.')).toBeInTheDocument();
    expect(screen.getByText('Dodaj pierwszy rozdział')).toBeInTheDocument();
    expect(screen.getByText('0 rozdziałów')).toBeInTheDocument();
  });
});
