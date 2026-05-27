'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollReveal } from '../motion/ScrollReveal';
import { RevealItem } from '../motion/RevealItem';
import { TextReveal } from '../motion/TextReveal';
import { easeSnap, stagger as staggerConst } from '../motion/easings';
import { capabilities } from '../data/capabilities';

export function Capabilities() {
  return (
    <section
      id="capabilities"
      className="bg-[var(--l-rule-2)]/40 py-28 md:py-36"
      style={{ background: 'linear-gradient(180deg, var(--l-paper) 0%, #ebe3d2 100%)' }}
    >
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <ScrollReveal y={16}>
              <p className="font-mono text-xs tracking-[0.18em] text-[var(--l-ink-4)] uppercase">
                Capabilities
              </p>
            </ScrollReveal>
            <TextReveal
              as="h2"
              text="Everything you need to run your studio"
              className="font-display mt-3 text-4xl tracking-tight text-balance md:text-5xl"
              stagger={staggerConst.fast}
            />
          </div>
          <ScrollReveal className="md:col-span-5 md:pt-2" y={16} delay={0.2}>
            <p className="text-[var(--l-ink-3)]">
              Strummy gives you one place to track students, plan lessons, and share progress. No
              more switching between apps. No more lost notes. Just teaching.
            </p>
          </ScrollReveal>
        </div>
        <ScrollReveal
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3"
          stagger={staggerConst.slow}
          y={24}
        >
          {capabilities.map((cap) => (
            <RevealItem
              key={cap.title}
              className="group rounded-xl border border-[var(--l-rule)] bg-[var(--l-card)] p-7 shadow-[var(--l-shadow-sm)] transition-shadow hover:shadow-[var(--l-shadow-md)]"
            >
              <motion.div
                whileInView={{ scale: 1 }}
                initial={{ scale: 0.85 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, ease: easeSnap }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--l-gold-tint)] text-[var(--l-gold-2)]"
              >
                <cap.icon className="size-5" />
              </motion.div>
              <h3 className="font-display mt-6 text-xl">{cap.title}</h3>
              <p className="mt-3 text-sm text-[var(--l-ink-3)]">{cap.description}</p>
            </RevealItem>
          ))}
        </ScrollReveal>
        <ScrollReveal y={16} delay={0.2} className="mt-12">
          <Link
            href="#workflow"
            className="group inline-flex items-center gap-2 rounded-md border border-[var(--l-rule)] bg-[var(--l-card)] px-4 py-2 text-sm text-[var(--l-ink)] transition-colors hover:bg-[var(--l-paper)]"
          >
            Explore
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
