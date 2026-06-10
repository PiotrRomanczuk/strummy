'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ScrollReveal } from '../motion/ScrollReveal';
import { useReducedMotionSafe } from '../motion/useReducedMotionSafe';
import { textures } from '../data/collages';

export function SubBand() {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({
    target: ref as React.RefObject<HTMLElement>,
    offset: ['start end', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 40, reduced ? 0 : -40]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--l-ink)] text-[var(--l-paper)]">
      <motion.div
        aria-hidden
        className="absolute inset-0 z-0 will-change-transform"
        style={{ y: bgY }}
      >
        <Image
          src={textures.concrete}
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--l-ink)]/40 via-[var(--l-ink)]/30 to-[var(--l-ink)]/55" />
      </motion.div>
      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-6 py-24 md:grid-cols-12 md:py-32">
        <ScrollReveal className="md:col-span-7" stagger={0.08} y={20}>
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--l-gold-dim)] uppercase">
            For guitar teachers
          </p>
          <h2 className="font-display mt-4 text-4xl tracking-tight text-balance md:text-5xl">
            Your studio, simplified
          </h2>
        </ScrollReveal>
        <ScrollReveal className="md:col-span-5 md:pt-2" stagger={0.08} y={16} delay={0.1}>
          <p className="text-[var(--l-ink-5)]">
            Independent teachers spend more time managing chaos than teaching. Strummy handles the
            admin so you can focus on what matters — your students and their growth.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-md bg-[var(--l-paper)] px-4 py-2 text-sm font-medium text-[var(--l-ink)] transition-transform hover:scale-[1.02]"
            >
              Get started
            </Link>
            <Link
              href="#pricing"
              className="rounded-md border border-[var(--l-paper)]/40 px-4 py-2 text-sm font-medium text-[var(--l-paper)] transition-colors hover:bg-[var(--l-paper)]/10"
            >
              See pricing
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
