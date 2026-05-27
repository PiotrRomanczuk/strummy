'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PhotoCollage } from '../motion/PhotoCollage';
import { ScrollReveal } from '../motion/ScrollReveal';
import { TextReveal } from '../motion/TextReveal';
import { efficiencyCollage } from '../data/collages';

export function Efficiency() {
  return (
    <section className="bg-[var(--l-paper)] py-28 md:py-36">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col justify-center">
          <ScrollReveal y={16}>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--l-ink-4)] uppercase">
              Efficiency
            </p>
          </ScrollReveal>
          <TextReveal
            as="h2"
            text="Lesson plans that write themselves"
            className="font-display mt-3 text-4xl tracking-tight text-balance md:text-5xl"
          />
          <ScrollReveal y={16} delay={0.2} className="mt-6">
            <p className="max-w-md text-[var(--l-ink-3)]">
              Tell Strummy what you want to teach and it builds a structured lesson plan in seconds.
              Adjust it, save it, reuse it. Teaching stays human. Admin becomes fast.
            </p>
          </ScrollReveal>
          <ScrollReveal y={16} delay={0.3} className="mt-8">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-md border border-[var(--l-rule)] bg-[var(--l-card)] px-4 py-2 text-sm text-[var(--l-ink)] transition-colors hover:bg-[var(--l-paper)]"
            >
              Try it
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </ScrollReveal>
        </div>
        <PhotoCollage items={efficiencyCollage} aspect="5/6" className="w-full" />
      </div>
    </section>
  );
}
