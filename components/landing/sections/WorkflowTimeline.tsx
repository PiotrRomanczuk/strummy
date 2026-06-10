'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from '../motion/ScrollReveal';
import { TextReveal } from '../motion/TextReveal';
import { TimelineTrack } from '../motion/TimelineTrack';
import { workflowDays } from '../data/workflow';

export function WorkflowTimeline() {
  return (
    <section id="workflow" className="bg-[var(--l-paper)] py-28 md:py-36">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <ScrollReveal y={16}>
              <p className="font-mono text-xs tracking-[0.18em] text-[var(--l-ink-4)] uppercase">
                Workflow
              </p>
            </ScrollReveal>
            <TextReveal
              as="h2"
              text="Your week with Strummy"
              className="font-display mt-3 text-4xl tracking-tight text-balance md:text-5xl"
            />
          </div>
          <ScrollReveal className="md:col-span-5 md:pt-2" y={16} delay={0.2}>
            <p className="text-[var(--l-ink-3)]">
              From planning to follow-up, Strummy fits into the rhythm of teaching. Here&apos;s what
              a week looks like.
            </p>
            <Link
              href="/sign-up"
              className="group mt-6 inline-flex items-center gap-2 rounded-md border border-[var(--l-rule)] bg-[var(--l-card)] px-4 py-2 text-sm text-[var(--l-ink)] transition-colors hover:bg-[var(--l-paper)]"
            >
              See it
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </ScrollReveal>
        </div>
        <div className="mt-20">
          <TimelineTrack days={workflowDays} />
        </div>
      </div>
    </section>
  );
}
