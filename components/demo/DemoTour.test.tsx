import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoTour } from './DemoTour';
import { tourStorageKey } from './demoTour.steps';

const driveMock = jest.fn();
const driverMock = jest.fn(() => ({ drive: driveMock }));

jest.mock('driver.js', () => ({
  __esModule: true,
  driver: (opts: unknown) => driverMock(opts),
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
