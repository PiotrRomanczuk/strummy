'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { getTourSteps, tourStorageKey, type TourRole } from './demo-tour.constants';

interface DemoTourProps {
  role: TourRole;
}

/**
 * Routes whose own chrome is docked to the bottom-right, where the replay
 * button lives.
 *
 * The AI chat is a full-height conversation view: its composer is pinned to
 * the bottom of the viewport and the send control is its right-most element,
 * exactly under a `fixed right-4 bottom-4` button. A demo visitor on a tablet
 * therefore could not send a message — every tap on Send hit the help bubble
 * instead (found by the 2026-08-28 nightly, iPad Pro, `demo-mutation-guards`).
 *
 * Suppressing the button here rather than nudging it upward: the tour's steps
 * anchor to dashboard chrome (sidebar, topbar, list surfaces) that this route
 * does not render, so `startTour` would drop below its two-step minimum and
 * bail anyway. A control that cannot do anything is not worth the collision.
 */
const ROUTES_WITHOUT_REPLAY_BUTTON = ['/dashboard/ai/chat'];

/**
 * First-run guided tour for demo accounts (driver.js). Mounted by the
 * dashboard layout ONLY for `isDevelopment` profiles, so real users never
 * load the library. Auto-starts once per role (localStorage), and stays
 * replayable via the floating help button.
 */
export function DemoTour({ role }: DemoTourProps) {
  const pathname = usePathname();
  const [isRunning, setIsRunning] = useState(false);
  const hasAutoStarted = useRef(false);

  const startTour = useCallback(async () => {
    if (typeof document === 'undefined') return;
    setIsRunning(true);

    const [{ driver }] = await Promise.all([
      import('driver.js'),
      // Stylesheet ships with the library; loaded here so non-demo sessions
      // never fetch it. Mapped to an empty module in Jest.
      import('driver.js/dist/driver.css'),
    ]);

    // Drop steps whose anchor isn't on screen (mobile hides the sidebar).
    const steps = getTourSteps(role).filter((s) => {
      const el = document.querySelector<HTMLElement>(s.selector);
      return el !== null && el.offsetParent !== null;
    });
    if (steps.length < 2) {
      setIsRunning(false);
      return;
    }

    // Mark seen as soon as the tour opens, not only when driver reports
    // destruction. A visitor can leave it by Escape, an outside click, or by
    // navigating away mid-tour — only the first of those reliably fires
    // onDestroyed, and re-greeting someone who already saw the tour is worse
    // than skipping it for someone who dismissed it instantly.
    localStorage.setItem(tourStorageKey(role), 'seen');

    const tour = driver({
      showProgress: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      popoverClass: 'strummy-tour',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      steps: steps.map((s) => ({
        element: s.selector,
        popover: { title: s.title, description: s.description },
      })),
      onDestroyed: () => {
        localStorage.setItem(tourStorageKey(role), 'seen');
        setIsRunning(false);
      },
    });
    tour.drive();
  }, [role]);

  const isSuppressed = ROUTES_WITHOUT_REPLAY_BUTTON.includes(pathname ?? '');

  useEffect(() => {
    if (hasAutoStarted.current || isSuppressed) return;
    hasAutoStarted.current = true;
    if (localStorage.getItem(tourStorageKey(role)) === 'seen') return;

    // Let the dashboard paint before dimming it.
    const timer = setTimeout(() => void startTour(), 800);
    return () => clearTimeout(timer);
  }, [role, startTour, isSuppressed]);

  if (isSuppressed) return null;

  return (
    <button
      type="button"
      onClick={() => void startTour()}
      disabled={isRunning}
      aria-label="Replay the demo tour"
      title="Replay the demo tour"
      data-testid="demo-tour-replay"
      className="bg-primary text-primary-foreground fixed right-4 bottom-4 z-40 grid size-10 place-items-center rounded-full shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
    >
      <HelpCircle className="size-5" aria-hidden="true" />
    </button>
  );
}
