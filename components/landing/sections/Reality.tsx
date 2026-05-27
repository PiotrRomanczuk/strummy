'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, FileText, Clock, MessageCircle } from 'lucide-react';
import { MaskedSection } from '../motion/MaskedSection';
import { ScrollReveal } from '../motion/ScrollReveal';
import { RevealItem } from '../motion/RevealItem';
import { realityPhoto } from '../data/collages';

const pains = [
  { icon: FileText, label: 'Notes scattered across devices' },
  { icon: MessageCircle, label: 'Parents asking for progress updates' },
  { icon: Clock, label: 'Lesson planning takes hours' },
];

export function Reality() {
  return (
    <section id="reality" className="bg-[var(--l-paper)] py-28 md:py-36">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-2 md:gap-16">
        <MaskedSection insetFrom={10} scaleFrom={1.08} rounded={16}>
          <div className="relative aspect-square w-full overflow-hidden">
            <Image
              src={realityPhoto.src}
              alt={realityPhoto.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </MaskedSection>
        <div className="flex flex-col justify-center">
          <ScrollReveal stagger={0.08} y={20}>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--l-ink-4)] uppercase">
              Reality
            </p>
            <h2 className="font-display mt-3 text-4xl tracking-tight text-balance md:text-5xl">
              The spreadsheet life isn&apos;t sustainable
            </h2>
            <p className="mt-5 max-w-md text-[var(--l-ink-3)]">
              You&apos;re managing student progress in three different apps, texting parents
              updates, and keeping lesson notes in a notebook that&apos;s probably in your gig bag.
              There has to be a better way.
            </p>
          </ScrollReveal>
          <ScrollReveal stagger={0.08} y={12} className="mt-8 space-y-3">
            {pains.map((p) => (
              <RevealItem
                key={p.label}
                className="flex items-center gap-3 text-sm text-[var(--l-ink-2)]"
              >
                <p.icon className="size-4 text-[var(--l-ink-4)]" aria-hidden />
                {p.label}
              </RevealItem>
            ))}
          </ScrollReveal>
          <ScrollReveal y={12} delay={0.2} className="mt-8">
            <Link
              href="#capabilities"
              className="group inline-flex items-center gap-2 rounded-md border border-[var(--l-rule)] bg-[var(--l-card)] px-4 py-2 text-sm text-[var(--l-ink)] transition-colors hover:bg-[var(--l-paper)]"
            >
              Learn more
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
