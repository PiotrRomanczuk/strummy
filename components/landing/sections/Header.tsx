'use client';

import Link from 'next/link';
import { StickyHeader } from '../motion/StickyHeader';

const nav = [
  { label: 'Features', href: '/#capabilities' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Teachers', href: '/#reality' },
  { label: 'Resources', href: '/#faq' },
];

export function Header() {
  return (
    <StickyHeader className="border-b border-[var(--l-rule)]/0">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl text-[var(--l-ink)]">
          Strummy
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm text-[var(--l-ink-3)] transition-colors hover:text-[var(--l-ink)]"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden rounded-md border border-[var(--l-rule)] bg-[var(--l-card)] px-3.5 py-1.5 text-sm text-[var(--l-ink)] transition-colors hover:bg-[var(--l-paper)] sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-[var(--l-ink)] px-3.5 py-1.5 text-sm text-[var(--l-paper)] transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </div>
      </div>
    </StickyHeader>
  );
}
