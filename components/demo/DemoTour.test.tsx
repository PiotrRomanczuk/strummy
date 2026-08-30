import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoTour } from './DemoTour';
import { tourStorageKey } from './demo-tour.constants';

const driveMock = jest.fn();
const driverMock = jest.fn(() => ({ drive: driveMock }));

jest.mock('driver.js', () => ({
  __esModule: true,
  driver: (opts: unknown) => driverMock(opts),
}));

/** Overrides jest.setup's fixed `usePathname` so route-gated behaviour is
 *  testable. Named `mock*` so Jest allows it inside the hoisted factory. */
const mockPathname = jest.fn<string, []>(() => '/dashboard');

jest.mock('next/navigation', () => ({
  __esModule: true,
  usePathname: () => mockPathname(),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

/** The component filters steps to visible anchors; jsdom reports offsetParent
 *  as null for everything, so visibility is stubbed per-test. */
function stubVisibleAnchors() {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return document.body;
    },
  });
  document.body.innerHTML += `
    <main></main>
    <a data-nav-item="Lessons"></a>
    <a data-nav-item="Songs"></a>
    <a data-nav-item="Assignments"></a>
    <a data-nav-item="Students"></a>
    <a data-nav-item="AI Assistant"></a>
    <a data-nav-item="My Lessons"></a>
    <a data-nav-item="My Assignments"></a>
    <a data-nav-item="Practice Log"></a>`;
}

describe('DemoTour', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    document.body.innerHTML = '';
    driveMock.mockClear();
    driverMock.mockClear();
    mockPathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-starts once for an unseen role', async () => {
    stubVisibleAnchors();
    render(<DemoTour role="teacher" />);

    await act(async () => {
      jest.advanceTimersByTime(900);
    });
    jest.useRealTimers();
    await waitFor(() => expect(driverMock).toHaveBeenCalledTimes(1));
    expect(driveMock).toHaveBeenCalledTimes(1);
  });

  it('does not auto-start when the tour was already seen', async () => {
    stubVisibleAnchors();
    localStorage.setItem(tourStorageKey('teacher'), 'seen');
    render(<DemoTour role="teacher" />);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(driverMock).not.toHaveBeenCalled();
  });

  it('skips the tour entirely when anchors are not visible', async () => {
    // No stub: jsdom's offsetParent is null → every step filtered out.
    render(<DemoTour role="teacher" />);

    await act(async () => {
      jest.advanceTimersByTime(900);
    });
    expect(driverMock).not.toHaveBeenCalled();
  });

  it('replays on demand via the help button even after being seen', async () => {
    stubVisibleAnchors();
    localStorage.setItem(tourStorageKey('teacher'), 'seen');
    render(<DemoTour role="teacher" />);
    jest.useRealTimers();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('demo-tour-replay'));

    await waitFor(() => expect(driverMock).toHaveBeenCalledTimes(1));
  });

  // The replay button is `fixed right-4 bottom-4`, and the AI chat's composer
  // is docked to the bottom of the viewport with Send as its right-most
  // control — so on that route the button sat on top of Send and a demo
  // visitor could not send a message at all (2026-08-28 nightly, iPad Pro).
  it('renders no replay button on the AI chat route, where it would cover Send', () => {
    stubVisibleAnchors();
    mockPathname.mockReturnValue('/dashboard/ai/chat');
    render(<DemoTour role="teacher" />);

    expect(screen.queryByTestId('demo-tour-replay')).not.toBeInTheDocument();
  });

  it('does not auto-start the tour on a route it does not render on', async () => {
    stubVisibleAnchors();
    mockPathname.mockReturnValue('/dashboard/ai/chat');
    render(<DemoTour role="teacher" />);

    await act(async () => {
      jest.advanceTimersByTime(900);
    });

    expect(driverMock).not.toHaveBeenCalled();
  });

  it('marks the tour seen as soon as it opens, before any close path runs', async () => {
    // Escape, an outside click, or navigating away mid-tour do not all fire
    // onDestroyed — recording it at open is what makes "once" actually once.
    stubVisibleAnchors();
    render(<DemoTour role="teacher" />);

    await act(async () => {
      jest.advanceTimersByTime(900);
    });
    jest.useRealTimers();
    await waitFor(() => expect(localStorage.getItem(tourStorageKey('teacher'))).toBe('seen'));
  });

  it('marks the tour seen when driver reports destruction', async () => {
    stubVisibleAnchors();
    render(<DemoTour role="student" />);

    await act(async () => {
      jest.advanceTimersByTime(900);
    });
    jest.useRealTimers();
    await waitFor(() => expect(driverMock).toHaveBeenCalled());

    const opts = driverMock.mock.calls[0][0] as { onDestroyed: () => void };
    act(() => opts.onDestroyed());
    expect(localStorage.getItem(tourStorageKey('student'))).toBe('seen');
  });
});
