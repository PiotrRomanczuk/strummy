import type { CollageItem } from '../motion/types';
import { photo } from './photo';

/**
 * Hero collage — three tilted photos stacked at varying parallax depths.
 * Replace each `src` with /landing/<slug>.jpg once real photos land in /public/landing/.
 *
 * Photo intent (see /public/landing/README.md):
 * - hero-teacher-couch: guitar teacher acoustic student living room
 * - hero-laptop-laugh:  two women laughing laptop couch
 * - hero-fretboard-hands: hands fretboard close up acoustic
 */
export const heroCollage: CollageItem[] = [
  {
    src: photo('hero-teacher-couch', 1600, 2000),
    alt: 'Guitar teacher with a student on a couch',
    w: 56,
    h: 70,
    x: 18,
    y: 4,
    rotate: -4,
    z: 1,
    parallaxSpeed: -0.15,
    tilt: true,
    priority: true,
    rounded: 14,
  },
  {
    src: photo('hero-laptop-laugh', 1200, 1500),
    alt: 'Two women laughing with a laptop on a couch',
    w: 38,
    h: 48,
    x: 56,
    y: 30,
    rotate: 6,
    z: 2,
    parallaxSpeed: -0.08,
    tilt: true,
    rounded: 12,
  },
  {
    src: photo('hero-fretboard-hands', 1200, 1500),
    alt: 'Close-up of hands on an acoustic guitar fretboard',
    w: 32,
    h: 40,
    x: 4,
    y: 50,
    rotate: -8,
    z: 3,
    parallaxSpeed: -0.22,
    tilt: true,
    rounded: 12,
  },
];

/**
 * Efficiency collage — mirror of hero but on the right side, calmer parallax.
 */
export const efficiencyCollage: CollageItem[] = [
  {
    src: photo('efficiency-planning', 1600, 2000),
    alt: 'Music teacher writing in a notebook',
    w: 54,
    h: 68,
    x: 22,
    y: 6,
    rotate: -3,
    z: 1,
    parallaxSpeed: -0.1,
    tilt: true,
    rounded: 14,
  },
  {
    src: photo('efficiency-student-smile', 1200, 1500),
    alt: 'Young guitar student smiling during a lesson',
    w: 36,
    h: 46,
    x: 56,
    y: 36,
    rotate: 5,
    z: 2,
    parallaxSpeed: -0.18,
    tilt: true,
    rounded: 12,
  },
  {
    src: photo('efficiency-sheet-music', 1100, 1300),
    alt: 'Handwritten tablature sheet music',
    w: 30,
    h: 36,
    x: 2,
    y: 54,
    rotate: -6,
    z: 3,
    parallaxSpeed: -0.05,
    tilt: true,
    rounded: 12,
  },
];

export const realityPhoto = {
  src: photo('reality-spreadsheet', 1400, 1400),
  alt: 'Two people laughing at a messy laptop on a sofa',
  w: 1400,
  h: 1400,
};

export const textures = {
  concrete: photo('texture-concrete', 2400, 1200),
};
