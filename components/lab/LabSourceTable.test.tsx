import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';

import { formatBytes, formatCell, pageHref } from './lab.helpers';
import { LabSourceTable } from './LabSourceTable';

describe('LabSourceTable', () => {
  it('shows every column and numbers rows from 1 in the source file', async () => {
    await renderServerTree(
      LabSourceTable({
        result: {
          rows: [{ title: 'Wonderwall', chords: ['Em7', 'G'] }],
          rowNumbers: [41],
          columns: ['title', 'chords'],
          total: 1,
          page: 1,
          pageSize: 50,
        },
      })
    );
    expect(screen.getByRole('columnheader', { name: 'chords' })).toBeInTheDocument();
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    expect(screen.getByText('["Em7","G"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Row 42' })).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    await renderServerTree(
      LabSourceTable({ result: { rows: [], rowNumbers: [], columns: [], total: 0, page: 1, pageSize: 50 } })
    );
    expect(screen.getByText('No rows match.')).toBeInTheDocument();
  });
});

describe('lab helpers', () => {
  it('formats sizes and long cells for one-line display', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1_536_000_000)).toBe('1.4 GB');
    expect(formatCell('x'.repeat(100))).toHaveLength(80);
    expect(formatCell(null)).toBe('');
  });

  it('keeps the query in page links and drops page 1', () => {
    expect(pageHref('/lab/sources/scan', { q: 'oasis', page: 2 })).toBe('/lab/sources/scan?q=oasis&page=2');
    expect(pageHref('/lab/sources/scan', { q: '', page: 1 })).toBe('/lab/sources/scan');
  });
});
