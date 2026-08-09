import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ListDetailPanel } from './ListDetailPanel';

const labels = { openFullPage: 'Open full page', close: 'Close' };

const renderPanel = () =>
  render(
    <ListDetailPanel
      label="Song detail: Blackbird"
      eyebrow="Song"
      fullPageHref="/dashboard/songs/1"
      closeHref="/dashboard/songs?page=2"
      labels={labels}
    >
      <p>body</p>
    </ListDetailPanel>
  );

describe('ListDetailPanel', () => {
  it('names itself after the record so it can be told from the nav landmark', () => {
    renderPanel();
    expect(
      screen.getByRole('complementary', { name: 'Song detail: Blackbird' })
    ).toBeInTheDocument();
  });

  it('offers both exits, with close preserving the rest of the query string', () => {
    renderPanel();
    const panel = screen.getByRole('complementary', { name: /Song detail/ });
    expect(within(panel).getByRole('link', { name: 'Open full page' })).toHaveAttribute(
      'href',
      '/dashboard/songs/1'
    );
    expect(within(panel).getByRole('link', { name: 'Close' })).toHaveAttribute(
      'href',
      '/dashboard/songs?page=2'
    );
  });

  it('renders a backdrop pointing at the same close href', () => {
    // Mobile-only via CSS: the sheet covers the list, so tapping outside has to
    // dismiss it. A Link rather than a div keeps that working without JS.
    const { container } = renderPanel();
    const backdrop = container.querySelector('.ui-list-panel-backdrop');
    expect(backdrop).toHaveAttribute('href', '/dashboard/songs?page=2');
    // Hidden from the a11y tree: ✕ is the labelled control, this is a duplicate.
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  });

  it('carries the classes the responsive rules key off', () => {
    const { container } = renderPanel();
    expect(container.querySelector('.ui-list-panel')).toBeInTheDocument();
    expect(container.querySelector('.ui-list-panel-scroll')).toHaveTextContent('body');
  });
});
