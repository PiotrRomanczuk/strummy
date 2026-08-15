import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  DataList,
  DataListActionCell,
  DataListCell,
  DataListRow,
  DataListTitle,
  type DataListColumn,
} from './DataList';

const TEMPLATE = '1fr 120px';

const columns: DataListColumn[] = [{ label: 'Title' }, { label: 'Author' }];

describe('DataList header', () => {
  it('renders a plain label for a column with no sort', () => {
    render(
      <DataList columns={columns} template={TEMPLATE}>
        <DataListRow template={TEMPLATE}>
          <DataListTitle>Blackbird</DataListTitle>
        </DataListRow>
      </DataList>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Title/ })).not.toBeInTheDocument();
  });

  it('renders a sortable column as a link with no arrow when another column owns the sort', () => {
    render(
      <DataList
        columns={[{ label: 'Title', sort: { href: '/x?sort=title', direction: null } }]}
        template={TEMPLATE}
      >
        <DataListRow template={TEMPLATE}>
          <DataListTitle>Blackbird</DataListTitle>
        </DataListRow>
      </DataList>
    );

    const link = screen.getByRole('link', { name: 'Title' });
    expect(link).toHaveAttribute('href', '/x?sort=title');
    expect(link).not.toHaveTextContent('↑');
    expect(link).not.toHaveTextContent('↓');
  });

  it.each([
    ['asc', '↑'],
    ['desc', '↓'],
  ] as const)('shows the %s arrow on the active sort column', (direction, arrow) => {
    render(
      <DataList
        columns={[{ label: 'Title', sort: { href: '/x', direction } }]}
        template={TEMPLATE}
      >
        <DataListRow template={TEMPLATE}>
          <DataListTitle>Blackbird</DataListTitle>
        </DataListRow>
      </DataList>
    );

    expect(screen.getByRole('link', { name: /Title/ })).toHaveTextContent(arrow);
  });

  it('renders the empty state instead of the header when there are no rows', () => {
    render(<DataList columns={columns} template={TEMPLATE} empty={<span>Nothing yet</span>} />);

    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    // A column strip above an empty table labels nothing.
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });
});

describe('DataListRow as a link', () => {
  it('stays a plain row when no href is given', () => {
    render(
      <DataListRow template={TEMPLATE}>
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('exposes the row link by its accessible name, not its text', () => {
    // The stretched link is empty — the visible title is a sibling cell — so
    // `a:has-text(...)` matches nothing and only the aria-label can find it.
    render(
      <DataListRow template={TEMPLATE} href="/dashboard/songs?selected=1" label="Blackbird">
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );

    const link = screen.getByRole('link', { name: 'Blackbird' });
    expect(link).toHaveAttribute('href', '/dashboard/songs?selected=1');
    expect(link).toBeEmptyDOMElement();
  });

  it('marks the selected row with aria-current', () => {
    render(
      <DataListRow template={TEMPLATE} href="/x" label="Blackbird" selected>
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );

    expect(screen.getByRole('link', { name: 'Blackbird' })).toHaveAttribute('aria-current', 'true');
  });

  it('leaves aria-current off an unselected row', () => {
    render(
      <DataListRow template={TEMPLATE} href="/x" label="Blackbird">
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );

    expect(screen.getByRole('link', { name: 'Blackbird' })).not.toHaveAttribute('aria-current');
  });

  it('opts a linked row into the pointer-events rule, and a plain row out', () => {
    // The class is what makes cells fall through to the stretched link. Without
    // it every click lands on a cell and the row never navigates.
    const { container, rerender } = render(
      <DataListRow template={TEMPLATE} href="/x" label="Blackbird">
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );
    expect(container.querySelector('.ui-datalist-linkrow')).toBeInTheDocument();

    rerender(
      <DataListRow template={TEMPLATE}>
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );
    expect(container.querySelector('.ui-datalist-linkrow')).not.toBeInTheDocument();
  });

  it('renders detail content beneath the row', () => {
    render(
      <DataListRow template={TEMPLATE} detail={<div>expanded</div>}>
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );

    expect(screen.getByText('expanded')).toBeInTheDocument();
  });

  it('renders the mobile meta line when given one', () => {
    render(
      <DataListRow template={TEMPLATE} mobileMeta="Lennon · beginner">
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );

    expect(screen.getByText('Lennon · beginner')).toBeInTheDocument();
  });
});

describe('DataListRow mobile affordances', () => {
  it('renders no trailing block when none is given', () => {
    const { container } = render(
      <DataListRow template={TEMPLATE}>
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );
    expect(container.querySelector('.ui-row-mobile-trail')).not.toBeInTheDocument();
  });

  it('renders the trailing block and opts into the split layout', () => {
    // Both are CSS-gated to phones; the classes are what the media query keys
    // off, so a missing class silently loses the mobile layout.
    const { container } = render(
      <DataListRow template={TEMPLATE} mobileSplit mobileTrail={<span>62%</span>}>
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );
    expect(container.querySelector('.ui-row-mobile-trail')).toHaveTextContent('62%');
    expect(container.querySelector('.ui-row-mobile-split')).toBeInTheDocument();
  });

  it('leaves the split class off unless asked', () => {
    const { container } = render(
      <DataListRow template={TEMPLATE} mobileTrail={<span>62%</span>}>
        <DataListTitle>Blackbird</DataListTitle>
      </DataListRow>
    );
    expect(container.querySelector('.ui-row-mobile-split')).not.toBeInTheDocument();
  });
});

describe('DataListActionCell', () => {
  it('keeps its control clickable inside a linked row', () => {
    // Inline pointer-events beats the .ui-datalist-linkrow rule — this is the
    // escape hatch that lets a row carry a button at all.
    render(
      <DataListRow template={TEMPLATE} href="/x" label="Blackbird">
        <DataListTitle>Blackbird</DataListTitle>
        <DataListActionCell testId="row-action">
          <button type="button">Add</button>
        </DataListActionCell>
      </DataListRow>
    );

    const cell = screen.getByTestId('row-action');
    expect(cell).toHaveStyle({ pointerEvents: 'auto' });
    expect(within(cell).getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

describe('DataListCell', () => {
  it('right-aligns when asked', () => {
    render(<DataListCell align="right">42</DataListCell>);
    expect(screen.getByText('42')).toHaveStyle({ textAlign: 'right' });
  });
});
