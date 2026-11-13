---
name: lesson-plan-generator
description: Generate structured lesson plans for guitar students based on their skill level, current songs, and learning goals. Use when preparing for lessons, creating practice schedules, or when a teacher asks for help planning a session.
---

# Lesson Plan Generator

> `sql("…")` below means a read-only query with `psql` against the stack you work on — dev by default: `ssh uwh docker exec -i supabase_db_StrummyDevelopment psql -U postgres -At -c "…"`. Real students live on production: query it read-only and only with Piotr's OK. (There is no Supabase MCP server in this setup.)

## Overview

Generate time-blocked, structured lesson plans by pulling real student data from Supabase (song repertoire, lesson history, notes) and synthesizing it via the AI layer into an actionable session plan.

## Usage

When invoked, gather these inputs:

1. **Student** -- name or ID (query `profiles` table)
2. **Session duration** -- 30, 45, or 60 minutes (default: 45)
3. **Focus area** (optional) -- technique, repertoire, theory, performance prep

Then execute:

### Step 1: Fetch Student Data

```bash
# Get student profile
sql("SELECT * FROM profiles WHERE id = '<student_id>' OR email ILIKE '%<name>%'")

# Get song repertoire with statuses
sql("
  SELECT s.id, s.title, s.author, s.level, s.key, s.chords, sr.status, sr.updated_at
  FROM songs s
  JOIN student_repertoire sr ON sr.song_id = s.id
  WHERE sr.student_id = '<student_id>'
  ORDER BY sr.updated_at DESC
")

# Get recent lessons (last 5)
sql("
  SELECT l.id, l.lesson_number, l.date, l.notes, l.status,
         array_agg(s.title) as songs_covered
  FROM lessons l
  LEFT JOIN lesson_songs ls ON ls.lesson_id = l.id
  LEFT JOIN songs s ON s.id = ls.song_id
  WHERE l.student_id = '<student_id>'
  GROUP BY l.id
  ORDER BY l.date DESC LIMIT 5
")

# Get pending assignments
sql("
  SELECT a.id, a.title, a.description, a.due_date, a.status
  FROM assignments a
  WHERE a.student_id = '<student_id>' AND a.status != 'completed'
  ORDER BY a.due_date
")
```

### Step 2: Determine Skill Level

Infer from data:

- **Beginner**: mostly `to_learn` songs, < 10 completed lessons, beginner-level songs
- **Intermediate**: mix of statuses, 10-50 lessons, intermediate songs, barre chords in repertoire
- **Advanced**: `remembered`/`mastered` songs, 50+ lessons, advanced songs

### Step 3: Generate Plan

Use the AI layer or structured template to build the plan:

```
Plan structure for {duration}-minute lesson:
1. Warm-up ({warm_up_time} min)
2. Technique focus ({technique_time} min)
3. Song work ({song_time} min) -- ordered by priority
4. New material / theory ({new_material_time} min)
5. Wrap-up & homework ({wrap_up_time} min)
```

### Step 4: Output Formatted Plan

Render as markdown with time stamps, song priorities, and homework assignments.

## Time Allocations

| Section            | 30 min | 45 min | 60 min |
| ------------------ | ------ | ------ | ------ |
| Warm-up            | 3 min  | 5 min  | 5 min  |
| Technique          | 5 min  | 10 min | 15 min |
| Song work          | 15 min | 20 min | 25 min |
| New material       | 4 min  | 5 min  | 10 min |
| Wrap-up & homework | 3 min  | 5 min  | 5 min  |

## Skill Level Guidelines

### Beginner

- **Warm-up**: open string exercises, simple finger stretches
- **Technique**: basic strumming patterns (D-DU, D-DU-UDU), open chords (G, C, D, Em, Am)
- **Song work**: one song at a time, focus on chord transitions
- **New material**: introduce one new chord or strumming pattern
- **Homework**: practice chord changes (2 min per transition), play-along with metronome at slow tempo

### Intermediate

- **Warm-up**: spider exercises, chromatic runs, fingerpicking warm-up
- **Technique**: barre chords (F, Bm), fingerpicking patterns, palm muting
- **Song work**: 2-3 songs in rotation, focus on fluency and dynamics
- **New material**: theory integration (chord families, progressions like I-IV-V-vi)
- **Homework**: song sections at target tempo, technique drills (5 min each)

### Advanced

- **Warm-up**: scale runs (pentatonic, major, modes), arpeggio patterns
- **Technique**: complex fingerpicking, hybrid picking, improvisation
- **Song work**: performance-ready run-throughs, dynamics and expression
- **New material**: music theory application (substitutions, modulation), ear training
- **Homework**: performance practice with backing tracks, composition exercises

## Song Priority Order

When selecting songs for the lesson, prioritize:

1. **`started`** songs -- actively being learned, highest ROI
2. **`to_learn`** songs with pending assignments -- student expects to work on these
3. **`remembered`** songs -- quick review to maintain, spaced repetition
4. **`to_learn`** songs (no assignment) -- introduce if time allows
5. **`mastered`** songs -- skip unless performance prep or student requests

## AI Integration

If the AI layer is available (`lib/ai/`), use it to enhance the plan:

```typescript
// Use the lesson-notes agent pattern for generating contextual notes
import { getAIProvider } from '@/lib/ai';

const provider = getAIProvider();
const prompt = `Generate a lesson plan for a ${skillLevel} guitar student.
Recent songs: ${songList}
Recent lesson notes: ${recentNotes}
Duration: ${duration} minutes
Focus: ${focusArea || 'general'}`;
```

Falls back to the structured template above when AI is unavailable.

## Output Format

```markdown
# Lesson Plan: {Student Name}

**Date**: {today} | **Duration**: {duration} min | **Level**: {level}

## 1. Warm-up (0:00 - {end_time})

- {exercises based on level}

## 2. Technique Focus ({start} - {end})

- {technique drills relevant to current songs}

## 3. Song Work ({start} - {end})

### Song A: "{title}" by {author} [STATUS: {status}]

- Focus: {specific section or skill}
- Goal: {measurable goal for this session}

### Song B: "{title}" by {author} [STATUS: {status}]

- Focus: {specific section or skill}
- Goal: {measurable goal for this session}

## 4. New Material ({start} - {end})

- {new chord, technique, or theory concept}

## 5. Homework ({start} - {end})

- [ ] {assignment 1 with time estimate}
- [ ] {assignment 2 with time estimate}
- [ ] {assignment 3 with time estimate}

**Notes for next lesson**: {carry-over items}
```

## Error Handling

- **No student found**: suggest searching by partial name or listing all students
- **No songs in repertoire**: generate a starter plan with basic exercises and suggest adding songs
- **No lesson history**: create an assessment/intake plan for first lesson
- **AI unavailable**: use structured template with manual song selection

## Examples

**Input**: "Generate a lesson plan for Maria, 45 minutes, focus on fingerpicking"

**Input**: "Quick 30-min plan for student ID abc-123"

**Input**: "Create a lesson plan for all my students this week"

## Key Files

- AI layer: `lib/ai/index.ts`, `lib/ai/agents/lesson-notes.ts`
- Student data: `types/User.ts`, `types/StudentRepertoire.ts`
- API endpoints: `/api/student/lessons`, `/api/song/student-songs`
- Supabase queries: `lib/supabase/`
