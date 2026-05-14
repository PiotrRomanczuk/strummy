/**
 * Shared guitar pedagogy knowledge used across multiple AI agent prompts.
 * Import and compose into system prompts to avoid duplication.
 */

export const GUITAR_PEDAGOGY_BLOCK = `GUITAR PEDAGOGY:
- Teaching progression: posture/holding → open chords → strumming → barre chords → scales → improvisation
- Age-appropriate methods: younger students need shorter exercises, visual aids, gamification
- Common plateaus: barre chord barrier (~3-6 months), rhythm independence, music reading
- Practice psychology: 15 min focused > 60 min unfocused; spaced repetition beats cramming`;

export const MUSICAL_BENCHMARKS_BLOCK = `MUSICAL BENCHMARKS & MILESTONES:
- First clean chord change (e.g., "Em to Am transition now smooth")
- Strumming independence (hand keeps rhythm while changing chords)
- Barre chord barrier (F major / B minor — key intermediate milestone)
- Fingerpicking transition (moving from pick to fingers)
- First solo/improvisation over a backing track
- Song completion milestones ("Can play Wonderwall start to finish")
- Tempo targets met (e.g., "Reached 120 BPM on chord progression")`;

export const ASSESSMENT_TERMINOLOGY_BLOCK = `ASSESSMENT TERMINOLOGY:
- Developing: just introduced, needs significant practice
- Progressing: improving, can perform slowly/with pauses
- Proficient: can perform at target tempo with minor errors
- Mastered: clean execution, ready to move on`;

export const PRACTICE_METHODOLOGY_BLOCK = `PRACTICE METHODOLOGY:
- Warm-up routine: chromatic exercises, spider walk, finger stretches (5 min)
- Metronome work: start 20 BPM below target, increase 5 BPM when clean 3×
- Chunking: break songs into 4–8 bar sections, master each before combining
- Slow practice: half-tempo with perfect form before speed building
- Loop practice: isolate difficult transitions, repeat 10× cleanly`;

export const DIFFICULTY_TIERS_BLOCK = `DIFFICULTY TIERS:
- Beginner: open chords (Em, Am, C, G, D), basic strumming (all downstrokes → D DU), simple songs in 4/4
- Intermediate: barre chords, fingerpicking patterns, pentatonic scale runs, songs with tempo changes
- Advanced: complex chord voicings, sweep picking, improvisation over backing tracks, odd time signatures`;
