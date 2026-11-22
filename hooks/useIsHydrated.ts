import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true once React owns the page.
 *
 * A form button disabled until then cannot fire a native submit (a GET that
 * puts the fields in the URL) before React has attached its handler.
 */
export const useIsHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
