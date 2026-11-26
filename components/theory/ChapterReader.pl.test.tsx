/** The chapter page in Polish: breadcrumb and a Polish "last updated" date. */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderPolish } from '@/lib/testing/intl-test-utils';
import ChapterReaderDesktop from './ChapterReader.Desktop';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

describe('ChapterReader (pl)', () => {
  it('shows the Polish breadcrumb and date format', () => {
    renderPolish(
      <ChapterReaderDesktop
        courseId="c-1"
        courseTitle="Podstawy harmonii"
        lesson={{
          id: 'l-1',
          title: 'Interwały',
          content: 'Treść',
          updated_at: '2026-07-27T12:00:00Z',
        }}
        prevChapter={null}
        nextChapter={null}
      />
    );
    expect(screen.getByText('Teoria')).toBeInTheDocument();
    expect(screen.getByText(/27\.07\.2026/)).toBeInTheDocument();
  });
});
