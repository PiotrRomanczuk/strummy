/**
 * Testing utilities for next-intl.
 * Renders components under a fixed English locale so existing text-based
 * queries (getByText('Save'), etc.) keep passing once components render
 * translated strings — messages/en.json is an exact copy of the strings
 * that used to be hardcoded.
 */

'use client';

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { render as rtlRender, RenderOptions } from '@testing-library/react';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';
import { resolveServerTree } from './resolve-async-server-components';

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

function PolishWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="pl" messages={plMessages} timeZone="Europe/Warsaw">
      {children}
    </NextIntlClientProvider>
  );
}

/** Same as `renderWithIntl`, but under `pl` with messages/pl.json. */
function renderPolish(ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: PolishWrapper, ...options });
}

/**
 * Custom render function that includes NextIntlClientProvider (fixed to 'en').
 * Usage: render(<MyComponent />, { wrapper: IntlWrapper })
 */
function renderWithIntl(ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: IntlWrapper, ...options });
}

/**
 * For trees containing async Server Components (anything using
 * getTranslations from next-intl/server) — resolves them first, since RTL's
 * synchronous render() can't await a function component itself.
 */
async function renderServerTree(ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) {
  const resolved = await resolveServerTree(ui);
  return rtlRender(resolved, { wrapper: IntlWrapper, ...options });
}

export { renderWithIntl, renderPolish, renderServerTree, IntlWrapper, PolishWrapper };
