---
description: Code conventions — component organization, naming, size limits, UI components, forms, styling
globs: ['components/**', 'lib/**', 'app/**', 'hooks/**', 'schemas/**']
---

## Component Organization

```
components/<domain>/<feature>/        # directories are ALWAYS kebab-case
├── index.ts                          # Re-exports
├── Feature.tsx                       # Main component
├── Feature.Header.tsx                # Sub-components use Parent.Section.tsx naming
├── Feature.test.tsx                  # Tests are colocated, never in __tests__/
├── useFeature.ts                     # Custom hook
└── feature.helpers.ts                # Support module: kebab-subject.role.ts
```

## File Naming (ONE convention — enforced by C6)

Every file under `components/` matches exactly one of these five shapes. There
is no sixth. `components/ui/` is exempt: it is the shadcn registry and keeps
that project's lowercase filenames.

| Kind           | Shape                                 | Example                  |
| -------------- | ------------------------------------- | ------------------------ |
| Component      | `PascalCase.tsx`                      | `SongForm.tsx`           |
| Sub-component  | `Parent.Section.tsx`                  | `SongForm.Preview.tsx`   |
| Hook           | `useThing.ts` (+ `useThing.types.ts`) | `useSongPicker.ts`       |
| Support module | `kebab-subject.role.ts`               | `song-picker.helpers.ts` |
| Barrel         | `index.ts`                            |                          |

`role` is a **closed vocabulary** — `helpers` · `types` · `constants` ·
`styles` · `data` · `i18n` · `shared`. Need a sixth role? Add it to this list
_and_ to `C6_ROLES` in `scripts/ci/check-structure.sh` in the same commit, or
it is not a role.

**Never** ship a bare support module (`format.ts`, `primitives.tsx`,
`helpers.ts`). The name has to say whose helpers these are: `format.ts` existed
three times in three domains, `primitives.tsx` four times, each exporting a
different `Card`. A qualified name makes the import site self-describing —
`import { Card } from './SongPrimitives'` instead of `from './primitives'`.

A module that exports components is a component file even when it exports
several: PascalCase, named for the group (`LessonDetailPrimitives.tsx`).

**Directories** are kebab-case, always — `songs/song-picker/`, not
`songs/SongPicker/`. A directory names a role, not a component; the component
inside it keeps its PascalCase filename.

**Tests** live beside their subject and inherit its name, plus an optional
flavor: `X.test.tsx`, `X.unit.test.ts`, `X.integration.test.ts`. A test covering
several modules in one directory takes the directory's subject
(`SharedPrimitives.unit.test.tsx`). No `__tests__/` directories under
`components/` — 59 of 60 tests were already colocated; that is the convention.

## Naming (identifiers)

- **Components/Types**: PascalCase (`StudentLesson.tsx`)
- **Functions/Variables**: camelCase (`fetchLessons()`)
- **Booleans**: `is/has/can` prefix (`isLoading`)
- **Hooks**: `use` prefix (`useStudentLesson`)
- **Sub-components**: `Parent.Section.tsx` (`StudentLesson.Song.tsx`)

## Size Limits (Enforced — by the lint ratchet)

One set of numbers, the same here, in `AGENTS.md` and in `eslint.config.mjs`
(#1218, 2026-11-27):

- `.tsx` file (components, pages, layouts): max **200** lines
- Any other file (hooks, `lib/`, route handlers, every `.ts`): max **150** lines, single responsibility
- Function body: max **50** lines

Lines are counted without blanks or comments, in `app/`, `components/`, `lib/`
and `hooks/`; tests, `types/` and migrations are exempt. ESLint reports them as
warnings (`max-lines`, `max-lines-per-function`), and warnings cannot grow:
`npm run check:lint-baseline` (in CI) fails when any rule has more warnings
than `scripts/ci/.lint-baseline.json`. So a **new** file or function over the
limit fails CI; the existing ones sit in the baseline until they are split
(#1066). Fixed some warnings? Lock the gain in with
`npm run check:lint-baseline -- --update-baseline` — it only ever lowers
counts. Raising one is a hand edit of the JSON that a reviewer has to accept.

Why these numbers and not ESLint's old 200/80: they were already the documented
rule every agent reads, and they match the workspace standard (files < 150,
components < 200, functions < 50). Loosening the docs to fit the linter would
have accepted the drift; tightening the linter makes the rule true, and the
ratchet keeps the jump in warnings (351 → 813) from turning into wallpaper.

## UI Components

**Never guess at shadcn/ui component APIs or props.** When creating or modifying
ANY UI component: if a shadcn MCP server is available in the session, query it
for component APIs and installation; otherwise read the actual source under
`components/ui/` and match what exists. Extend existing components rather than
building from scratch. (`.mcp.json` is gitignored and personal — a shadcn MCP
server may or may not be configured; never assume it.)

## Form Validation

- Validate on blur, not on every keystroke
- Use Zod schemas from `/schemas`
- Clear errors when user starts typing

## Styling

Mobile-first with Tailwind breakpoints. Always include `dark:` variants.
