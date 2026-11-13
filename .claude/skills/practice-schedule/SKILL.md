---
name: practice-schedule
description: Create personalized weekly practice schedules for guitar students based on their active songs, skill level, and available practice time. Use when students need structured daily practice routines or teachers want to assign home practice.
---

# Practice Schedule Builder

## Overview

Generate day-by-day practice schedules tailored to each student's active repertoire, skill level, and available time. Outputs printable schedules with exercises, time allocations, and progress checkboxes.

## Usage

When invoked, gather:

1. **Student** -- name or ID
2. **Practice days** -- which days per week (default: Mon-Fri)
3. **Daily practice time** -- minutes available (default: 30)
4. **Next lesson date** -- to work backwards from (default: next 7 days)

## Execution Steps

### Step 1: Fetch Active Songs

```sql
SELECT s.title, s.author, s.level, s.key, s.chords, sr.status
FROM student_repertoire sr
JOIN songs s ON s.id = sr.song_id
WHERE sr.student_id = '<student_id>'
  AND sr.status != 'mastered'
ORDER BY
  CASE sr.status
    WHEN 'started' THEN 1
    WHEN 'to_learn' THEN 2
    WHEN 'remembered' THEN 3
  END;
```

### Step 2: Fetch Pending Assignments

```sql
SELECT title, description, due_date
FROM assignments
WHERE student_id = '<student_id>'
  AND status != 'completed'
ORDER BY due_date;
```

### Step 3: Build Schedule

Distribute songs across practice days using these rules:

**Time Blocks** (for 30 min daily):

| Block            | Time   | Purpose                            |
| ---------------- | ------ | ---------------------------------- |
| Warm-up          | 5 min  | Finger exercises, stretches        |
| Focus song       | 10 min | Active "started" song -- deep work |
| Secondary song   | 8 min  | Rotation of other active songs     |
| Technique        | 5 min  | Exercises related to current songs |
| Cool-down review | 2 min  | Quick run of a "remembered" song   |

Scale proportionally for other durations (15, 20, 45, 60 min).

**Song Rotation Logic**:

- **`started` songs**: appear 3-4x per week (highest frequency)
- **`to_learn` songs**: appear 1-2x per week (introduction pace)
- **`remembered` songs**: appear 1x per week (maintenance)
- Never schedule more than 3 songs per day
- Pair challenging songs with easier ones

### Step 4: Output Schedule

## Output Template

```markdown
# Weekly Practice Schedule: {Student Name}

**Week of**: {start_date} | **Next lesson**: {lesson_date}
**Daily target**: {minutes} minutes

---

## Monday

- [ ] **Warm-up** (5 min): {level-appropriate exercises}
- [ ] **"{Song A}"** (10 min): Focus on {specific section/skill}
- [ ] **"{Song B}"** (8 min): {practice goal}
- [ ] **Technique** (5 min): {exercise name}
- [ ] **Review** (2 min): Quick play-through of "{Song C}"

## Tuesday

- [ ] **Warm-up** (5 min): {exercises}
- [ ] **"{Song A}"** (10 min): {different section than Monday}
- [ ] **"{Song D}"** (8 min): {practice goal}
- [ ] **Technique** (5 min): {exercise}
- [ ] **Review** (2 min): "{Song E}"

{... repeat for each practice day ...}

## Before Your Lesson ({lesson_date})

- [ ] Run through "{Song A}" start to finish
- [ ] Review any tricky sections marked above
- [ ] Write down questions for your teacher

---

## This Week's Goals

1. {Measurable goal for primary song}
2. {Technique milestone}
3. {Assignment due date reminder}

**Tip of the week**: {context-appropriate practice tip}
```

## Warm-up Exercises by Level

### Beginner

- Finger stretches (30 sec each hand)
- Open string picking (alternate picking, each string 4x)
- Chord transition drill: {chord1} → {chord2} (1 min, metronome at 60 BPM)

### Intermediate

- Spider exercise (frets 1-4, all strings)
- Chromatic scale (ascending/descending, 80 BPM)
- Fingerpicking pattern: p-i-m-a on open chords

### Advanced

- Scale runs in current key (2 octaves, 100+ BPM)
- Arpeggio patterns across chord shapes
- Improvisation warm-up over backing track (2 min)

## Practice Tips Library

Rotate these tips based on student level:

- "Use a metronome! Start slow and increase 5 BPM when comfortable."
- "Practice the hard parts first while your fingers are fresh."
- "Record yourself and listen back -- you'll hear things you miss while playing."
- "If you can play it slow, you can play it fast. Never rush."
- "Take a 1-minute break between songs to reset your focus."
- "Practice chord changes in isolation before playing the full song."

## Delivery Options

- **Markdown**: output in conversation (default)
- **PDF**: use `pdf` skill to generate printable version
- **Email**: send to student via notification service

## Error Handling

- **No active songs**: suggest beginner exercises and recommend adding songs to repertoire
- **Only mastered songs**: congratulate student, suggest advancing to new material
- **Very short practice time** (< 15 min): focus on one song + warm-up only
- **No practice days selected**: default to weekdays (Mon-Fri)

## Examples

**Input**: "Create a practice schedule for Alex, 30 min daily, Mon-Fri"

**Input**: "Weekly practice plan for student abc-123, 45 min, next lesson Thursday"

**Input**: "Generate practice schedules for all active students"

## Key Files

- Song data: `types/StudentRepertoire.ts`, `songs` in `database.types.ts`
- Assignment tracking: `assignments` in `database.types.ts`
- Lesson scheduling: `types/Lesson.ts`
- PDF generation: `.claude/skills/pdf/SKILL.md`
