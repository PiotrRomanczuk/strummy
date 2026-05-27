'use client';

import { Marquee } from '../motion/Marquee';
import { ScrollReveal } from '../motion/ScrollReveal';
import { logoMarks } from '../data/logos';

export function LogoCloud() {
  return (
    <section className="bg-[var(--l-paper)] py-20">
      <div className="mx-auto w-full max-w-7xl px-6">
        <ScrollReveal className="text-center" y={12}>
          <p className="text-sm text-[var(--l-ink-3)]">
            Trusted by independent guitar teachers across North America
          </p>
        </ScrollReveal>
        <div className="mt-10">
          <Marquee duration={48}>
            {logoMarks.map((logo) => (
              <span
                key={logo.name}
                className="font-display text-2xl whitespace-nowrap text-[var(--l-ink-4)] opacity-60 transition-opacity hover:opacity-100"
              >
                {logo.name}
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
