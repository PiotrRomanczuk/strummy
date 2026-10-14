---
created: 2026-10-14
updated: 2026-10-14
---

# Strummy — Design System

Derived from the code on 2026-10-14. Every variable, class and file named here exists in the tree; when this doc and the code disagree, the code wins and this doc gets fixed. Supersedes the token/typography sections of `.interface-design/system.md` and `docs/app-blueprint/reference/UI_STANDARDS.md`.

## 1. Direction

Strummy reads like a music teacher's paper notebook: an ivory page, ink-coloured text, one gold accent, a serif (Fraunces) for titles over a quiet sans (Geist) for everything else, mono for eyebrows and table headers. Surfaces are flat — rule-coloured 1px borders instead of shadows, 10px radii, no gradients inside the app (the gold gradient utilities survive only on the public landing). The dark palette is the same page under a desk lamp: obsidian surfaces, warmer gold, the same contrast ratios. This visual language is the `.theme-strummy` token layer in `app/design-tokens.css`; it began life as the "editorial" prototype (2026-07) and is now the app's only look — there is no second theme to fall back to.

Two layers coexist and both are live:

| Layer                                      | File                    | Scope                                                            | Used by                                                                          |
| ------------------------------------------ | ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| shadcn/Tailwind semantic tokens            | `app/globals.css`       | `:root` / `.dark`, global                                        | `components/ui/*`, `bg-background`, `text-muted-foreground`, … (~780 class uses) |
| Strummy tokens (`.theme-strummy` + `ui-*`) | `app/design-tokens.css` | wrapper class on dashboard, auth, onboarding, landing, fretboard | `var(--ink)`, `var(--gold)`, `ui-row`, … (~1 800 uses)                           |

New UI goes on the Strummy layer. shadcn primitives still render inside it because `--card`, `--radius-*` and `--success` are redefined under `.theme-strummy`.

## 2. Tokens

### Colour — Strummy layer (`app/design-tokens.css:6` light, `:55` dark)

| Token                                                        | Role                           | Light                                         | Dark (`.dark .theme-strummy` or `.theme-strummy.theme-dark`) |
| ------------------------------------------------------------ | ------------------------------ | --------------------------------------------- | ------------------------------------------------------------ |
| `--ivory`                                                    | page background                | `#f6f2ea`                                     | `#15110e`                                                    |
| `--paper`                                                    | rails: sidebar, topbar, panels | `#fbf8f1`                                     | `#1a1612`                                                    |
| `--card`                                                     | card surface                   | `#ffffff`                                     | `#221c17`                                                    |
| `--ink` / `--ink-2`                                          | primary text / headings        | `#1a1613` / `#2a2420`                         | `#f5efe4` / `#e6decd`                                        |
| `--ink-3` / `--ink-4` / `--ink-5`                            | secondary / muted / disabled   | `#4a4037` / `#8a7e70` / `#c7bdaf`             | `#b5a995` / `#7a6e5e` / `#40372d`                            |
| `--rule` / `--rule-2`                                        | borders / tinted strips, hover | `#e6dccb` / `#efe7d6`                         | `#2e2620` / `#362c24`                                        |
| `--gold` / `--gold-2`                                        | accent / accent text           | `#c89523` / `#b17f12`                         | `#e7b64a` / `#f0c968`                                        |
| `--gold-dim` / `--gold-tint`                                 | subdued accent / tinted fill   | `#e9c874` / `#fbf1d3`                         | `#8a6a1e` / `#3a2d14`                                        |
| `--success` / `--warn` / `--danger` / `--info`               | status                         | `#3a7d3a` / `#c89523` / `#b84a3a` / `#3a5a7d` | `#7ac47a` / `#e7b64a` / `#e8806e` / `#8ab0d8`                |
| `--on-accent`                                                | text on gold/ink fills         | `#ffffff`                                     | same                                                         |
| `--brand-spotify` / `--brand-youtube` / `--brand-soundcloud` | third-party marks              | `#1db954` / `#ff0000` / `#f58220`             | same                                                         |

Consume as Tailwind arbitrary values — `bg-[var(--paper)]`, `text-[var(--ink-4)]`, `border-[var(--rule)]` — the way `components/dashboard/sidebar/Sidebar.tsx` does. Tinted status fills use `color-mix(in srgb, var(--success) 12%, var(--card))` (see `TONE_STYLES`, `components/shared/ToneBadge.tsx:6`).

### Colour — shadcn layer (`app/globals.css:135` light, `:198` dark; Tailwind names via `@theme inline`, `:9`)

| CSS var → class stem                                                                                                                                               | Light                                                   | Dark                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------- |
| `--background` / `--foreground`                                                                                                                                    | `hsl(40 20% 98%)` / `hsl(0 0% 12%)`                     | `#131313` / `#e5e2e1`                                   |
| `--card`, `--popover` (+ `-foreground`)                                                                                                                            | `hsl(0 0% 100%)` / `hsl(0 0% 12%)`                      | `#201f1f` / `#e5e2e1`                                   |
| `--primary` / `--primary-foreground`                                                                                                                               | `hsl(42 90% 30%)` (WCAG-AA gold) / white                | `#ffd183` / `#422c00`                                   |
| `--secondary`, `--muted`, `--accent`                                                                                                                               | `hsl(40 10% 90%)`, `hsl(40 10% 93%)`, `hsl(42 40% 91%)` | `#1c1b1b`, `#2a2a2a`, `#33302a`                         |
| `--muted-foreground`                                                                                                                                               | `hsl(40 10% 40%)`                                       | `#d5c4ad`                                               |
| `--destructive`                                                                                                                                                    | `hsl(0 84% 60%)`                                        | `#ffb4ab`                                               |
| `--border` / `--input` / `--ring`                                                                                                                                  | `hsl(40 10% 88%)` ×2 / `hsl(42 90% 45%)`                | `#504534` / `#0e0e0e` / `#ffd183`                       |
| `--success` / `--warning` (+ `-foreground`)                                                                                                                        | `hsl(142 76% 36%)` / `hsl(38 92% 50%)`                  | `hsl(142 69% 45%)` / unchanged                          |
| `--sidebar-*` (8 vars)                                                                                                                                             | paper-tinted greys, gold primary                        | obsidian + `#ffd183`                                    |
| `--chart-1…5`                                                                                                                                                      | oklch palette                                           | separate oklch palette                                  |
| `--surface-container-*` (5 tiers), `--on-surface-variant`, `--outline`, `--outline-variant`, `--primary-container`, `--on-primary`, `--tertiary`, `--surface-tint` | **dark only** (M3 "Virtuoso's Studio"); unset in light  | `#201f1f`…`#0e0e0e`, `#9d8f7a`, `#f2b127`, `#a9e0ff`, … |

`--accent` is shadcn's _hover surface_ (Select/DropdownMenu item focus, ghost buttons) — keep it a tint, never a saturated colour (UIX-2 note, `globals.css:157`).

### Typography

| Token                                         | Value                                                                     | Defined                                     |
| --------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `--serif` / `--font-serif` / `--font-display` | Fraunces (`--font-fraunces`), fallback Iowan Old Style, Georgia           | `design-tokens.css:34`, `globals.css:13,16` |
| `--sans` / `--font-sans`                      | Geist (`--font-geist` on Strummy routes, `--font-geist-sans` on the body) | `design-tokens.css:35`, `globals.css:12`    |
| `--mono` / `--font-mono`                      | Geist Mono (`--font-geist-mono`)                                          | `design-tokens.css:36`, `globals.css:14`    |
| `--font-music`                                | SF Mono stack for chord/tab text                                          | `globals.css:15` (no consumers yet)         |

Fonts load through `next/font/google`. The dashboard, auth and 404 shells apply `dashboardFontVariables` (`lib/config/dashboard-fonts.ts:30`: Geist 300–700, Geist Mono 400/500, Fraunces with the `opsz` axis); public pages pass the same three `.variable` classes alongside `theme-strummy`. `lib/fonts/` holds a 22-scheme runtime switcher (`DYNAMIC_FONT_SWITCHING = true`, `fonts.config.ts:12`, active scheme `fraunces`) applied on `<body>` by `app/layout.tsx`; the Strummy routes override it with the Fraunces/Geist set regardless of the chosen scheme.

Scale in use (px, Strummy layer): eyebrow/table header `10–11px` mono uppercase `letter-spacing .14–.16em`; body `13px`; tab `14px`; card title `20px` serif; page title `34px` serif `tracking-[-0.02em]` (`components/shared/ListPageHeader.tsx:34`); form title `40px` serif italic (`components/shared/form.styles.ts`); landing display `.ui-land-h1` `clamp(44px, 5.5vw, 76px)`, `.ui-land-display-{34,44,48,56}` (`design-tokens.css:953`). Tailwind class `font-serif` is the shortcut for Fraunces.

### Spacing, radius, shadow

| Kind             | Tokens / values                                                                                                                                                            | Defined                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Radius (Strummy) | `--radius-sm: 6px`, `--radius: 10px`, `--radius-lg: 14px`                                                                                                                  | `design-tokens.css:38`                |
| Radius (shadcn)  | `--radius: 0.625rem`; `--radius-sm/md/lg/xl` = radius −4/−2/0/+4 px                                                                                                        | `globals.css:66,136`                  |
| Shadow (Strummy) | `--shadow-sm`, `--shadow-md` — ink-tinted, ≤6% alpha; cards use borders, not shadows                                                                                       | `design-tokens.css:42`                |
| Shadow (legacy)  | `--shadow-glow`, `--shadow-card`, `.glow`, `.landing-shadow-card*`                                                                                                         | `globals.css:194,343+` — landing only |
| Spacing          | Tailwind 4px scale in `className`; Strummy classes use px literals: page `padding: 24px 32px 64px` (`.ui-dash-page`, `:1409`), phones `4px 16px 32px`; grid gaps `14–20px` | `design-tokens.css`                   |
| Sticky chrome    | `--sticky-header-offset: 4rem` → `html { scroll-padding-top }` so anchors clear the `h-14` topbar                                                                          | `globals.css:141,292`                 |
| Safe areas       | `.pt-safe .pb-safe .pl-safe .pr-safe .px-safe`, `.pb-keyboard` (from `useKeyboardViewport`)                                                                                | `globals.css:383+`                    |

### Breakpoints

| Where                               | Values                                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind defaults                   | `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536` — `md` is the shell's phone/desktop split                                                                                                                                          |
| Custom (`@theme`, `globals.css:77`) | `xs: 475px`, `portrait: 1080px`, `ultrawide: 2560px` — only `xs:` is used (2 places)                                                                                                                                                        |
| `design-tokens.css` `@media`        | desktop-first `max-width` queries: `860px` (lists, grids, panels — the main collapse point), `767px` (phone layouts), `640/560/480/400px` (tight phones), `1080/1100px` (landing, rails)                                                    |
| JS                                  | `useMediaQuery('(min-width: 768px)')` in `components/ui/responsive-dialog.tsx` (Dialog ↔ Drawer); `useLayoutMode()` in `hooks/useIsWidescreen.ts` (`≥1024 & aspect ≥1.2` widescreen · `≥768` tablet · else mobile) for the peripheral shell |

## 3. The `ui-*` classes (Strummy component classes)

Defined only in `app/design-tokens.css`, always scoped as `.theme-strummy .ui-…`, 170 classes grouped by surface (list/table `:231`, forms `:332`, tabs `:514`, parent portal `:601`, list panel `:661`, onboarding `:715`, landing `:872`, fretboard `:1123`, dashboard pages `:1409+`). The header comment (`:80`) states the contract: **"Inline React styles cannot express `:hover`, `:focus-visible`, or `@media`, so every interactive/layout concern lives here as a small class the components opt into."**

| Need                                  | Use                                               | Example                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hover / focus / selected state        | a `ui-*` class                                    | `ui-row`, `ui-chip`, `ui-tab[aria-selected]`, `ui-quick-action`                                                                                                                           |
| responsive collapse of a grid or rail | a `ui-*` class                                    | `ui-datalist-grid`, `ui-grid-form` (`1fr 320px` → 1 col), `ui-detail-grid` (`1.4fr 1fr` → 1 col), `ui-form-row-2/3/4`, `ui-stat-tiles`, `ui-list-panel` (340px rail → fixed bottom sheet) |
| static colour / type / spacing        | Tailwind classes with `var(--…)` arbitrary values | `bg-[var(--paper)] text-[13px] border-[var(--rule)]`                                                                                                                                      |
| anything shadcn already styles        | the shadcn component unchanged                    | `Button`, `Sheet`, `DropdownMenu`                                                                                                                                                         |

Rules: interaction, responsive and dark-mode styling live in `design-tokens.css` (`ui-*`) or in `dark:`/responsive Tailwind variants — **never in inline `style`**. Column templates that are composed at runtime go through a CSS custom property (`--cols` on `.ui-datalist-grid`, see `components/shared/DataList.tsx:29`), because Tailwind's scanner cannot see a class built from a string. Add a new `ui-*` class only when a Tailwind variant cannot express it; name it `ui-<surface>-<part>`.

**Known debt.** Older Strummy components (2026-07/08, "Claude Design" ports) carry _static_ colour/layout as inline `style={{…}}` objects and `*.styles.ts` constants (`components/shared/form.styles.ts`, `data-list.styles.ts`, `DesignCard.tsx`, 297 files in all). That was the layer's original convention ("static layout stays inline", UI_STANDARDS 2026-07-26). It conflicts with the global Tailwind rule (`~/.claude/rules/code-quality.md`: no inline style objects); new code and touched code follow the global rule — `className` with tokens, `style` only for a runtime-computed value such as a progress width or `--cols`.

## 4. Layout

### Shells (three)

| Route family                                        | Shell                                                                                                                                                                                                                                                                                                                                      | Files                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `/dashboard/*`                                      | `theme-strummy` flex row: `Sidebar` (desktop, `hidden md:flex md:w-[232px] md:sticky md:h-screen`, paper rail, gold active bar) + column of `Topbar` (`sticky top-0 h-14 bg-[var(--paper)]`, hamburger → `SidebarMobileSheet` below `md`, search pill, bell, role switcher) + `<main>`. Parents get `FamilyPortalBar` instead of the rail. | `app/dashboard/layout.tsx`, `components/dashboard/{sidebar,topbar}/`, `components/dashboard/FamilyPortalBar.tsx` |
| peripheral authenticated (`/ai`, `/unsubscribe`, …) | `NavigationShell`: mobile = `Header` (`h-14`) + `MobileBottomNav` (3 shared tabs + role tab + More sheet, Framer layout indicator) ; widescreen = lazy `NavigationShell.Desktop`                                                                                                                                                           | `components/layout/AppShell.tsx`, `components/navigation/*`                                                      |
| auth, onboarding, landing, `/fretboard`, 404        | own full-page layout inside `theme-strummy`; no app chrome                                                                                                                                                                                                                                                                                 | `app/(auth)/layout.tsx`, `components/onboarding/*`, `components/landing/*`                                       |

`AppShell` decides which by pathname; `Toaster` (sonner) mounts once per shell.

### Page skeleton (dashboard)

```
<div class="ui-dash-page">                  padding 24/32/64px → 4/16/32px on phones
  <ListPageHeader | FormPageHeader | .ui-page-head>   34px serif title, 13px muted meta, actions right
  <ui-tabs> (optional section tabs, count pills)
  <DesignCard | DataList | ui-grid-*>        white card, 1px rule, 10px radius
</div>
```

No `max-w-*` container on dashboard pages — content spans the column; only forms cap at `720px` (`form.styles.ts`) and the landing at `1440px` (`.ui-land-container`, `padding 0 96px → 48px → 22px`). `MobilePageShell` (`components/shared/MobilePageShell.tsx`) is the sticky-header + back-button wrapper for phone-only pages, padded for the 64px bottom nav + safe area.

### List / table pattern

Contract: `docs/app-blueprint/reference/LIST_TABLE_PATTERN.md` — all list state (`search`, `sort`, `page`, `selected`, domain facets) lives in the URL; the page is an RSC. Primitive: `DataList` / `DataListRow` / `DataListCell` / `DataListTitle` / `DataListActionCell` (`components/shared/DataList.tsx`) — card shell, mono uppercase header strip on `--rule-2`, `ui-row` rows, `--cols` template, collapses to a single column with `ui-datalist-mobile-meta` at ≤860px. Companions: `ListPageHeader`, `ListFilters` / `FilterChipRow` / `CollapsibleFilterBar`, `ListPagination`, `ListDetailPanel` (340px right rail → bottom sheet). Reference implementation: `components/songs/SongsList*.tsx`. Admin/debug tables use `components/ui/table.tsx` + `sortable-table-head.tsx` + `hooks/useSortableTable.ts` instead.

### Forms

Zod schemas in `/schemas/*Schema.ts` are the single validation source. Server Actions (`app/actions/*`) `safeParse` the `FormData` and return field errors; forms read them via `useActionState` (`components/songs/form/SongForm.tsx:27`). `react-hook-form` + `zodResolver` appears in two modals only (`SongOfTheWeekAdmin`, `SongRequestModal`). UX rule (`.claude/rules/code-style.md`): validate on blur, not per keystroke; clear a field's error when the user starts typing. Layout primitives: `FormPageHeader`, `FormSection` (numbered collapsible card with `n/m` pill), `FormActions`, `FormAlert`, `FormPreviewPanel` + `ui-grid-form` (form + sticky 320px preview rail), `ui-form-row-2/3/4`, `ui-field-label` (mono eyebrow; `[data-required]` adds the star). `StepWizardForm` for multi-step. Field-level inventory (partly stale): `docs/app-blueprint/reference/FORMS_SPECIFICATION.md`.

## 5. Components

### shadcn/ui registry — `components/ui/` (style `new-york`, base `neutral`, CSS variables, icons `lucide`; `components.json`)

`accordion` · `alert` · `alert-dialog` · `avatar` · `badge` · `button` · `card` · `checkbox` · `dialog` · `drawer` · `dropdown-menu` · `input` · `label` · `popover` · `progress` · `scroll-area` · `select` · `sheet` · `skeleton` · `switch` · `table` · `textarea` · `tooltip` — plus house additions in the same folder: `mode-toggle`, `responsive-dialog` (Dialog ≥768px, Drawer below), `skeleton-screens`, `sortable-table-head`.

`Button` variants: `default · destructive · outline · secondary · ghost · link`; sizes `default (h-9) · sm (h-8) · lg (h-10) · icon · icon-sm · icon-lg`. **Never guess shadcn props — open the file in `components/ui/` and match what exists** (`.claude/rules/code-style.md`). `cn()` lives in `lib/utils/index.ts`.

### House primitives

| Component                                                                                                     | File                                                                                                                                                                                                                                                                           | Notes                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `DesignCard`, `DesignCardHeader`, `DesignCardBody`                                                            | `components/shared/DesignCard.tsx`                                                                                                                                                                                                                                             | white surface, rule border, 10px; header = mono eyebrow + 20px serif title + action            |
| `DataList*`                                                                                                   | `components/shared/DataList.tsx`                                                                                                                                                                                                                                               | see §4                                                                                         |
| `ListPageHeader`, `FormPageHeader`, `FormTitleAccent`                                                         | `components/shared/`                                                                                                                                                                                                                                                           | page titles                                                                                    |
| `StatusBadge`                                                                                                 | `components/shared/StatusBadge.tsx`                                                                                                                                                                                                                                            | pill; caller passes `styleMap`/`labelMap` per status (Tailwind classes)                        |
| `ToneBadge`, `TONE_STYLES`                                                                                    | `components/shared/ToneBadge.tsx`                                                                                                                                                                                                                                              | tones `neutral · gold · success · danger · info` on Strummy tokens                             |
| `EmptyState`                                                                                                  | `components/shared/EmptyState.tsx`                                                                                                                                                                                                                                             | `icon`/`illustration`, title, description, action; variants `default · card · table-cell`      |
| `LoadingScreen`, `RouteError`, `ErrorBoundary`, `DashboardErrorState`                                         | `components/shared/`, `components/dashboard/`                                                                                                                                                                                                                                  | loading / error surfaces                                                                       |
| `BottomActionSheet`, `FloatingActionButton`, `SwipeableListItem`, `FullScreenSearchPicker`, `MobilePageShell` | `components/shared/`                                                                                                                                                                                                                                                           | phone interaction set                                                                          |
| `BrandMark` / `PickMark`                                                                                      | `components/shared/BrandMark.tsx`                                                                                                                                                                                                                                              | logo, uses `--gold-2`                                                                          |
| Domain primitives                                                                                             | `components/dashboard/DashboardPrimitives.tsx`, `lessons/LessonPrimitives.tsx`, `lessons/detail/LessonDetailPrimitives.tsx`, `songs/SongPrimitives.tsx`, `dashboard/student/StudentHomePrimitives.tsx`, `fretboard/Fretboard.Primitives.tsx`, `landing/Landing.primitives.tsx` | each exports its domain's `Card`/`CardHeader`/pills; import by file, never a bare `primitives` |

File naming under `components/` is fixed and enforced (`C6` in `npm run check:structure`): `PascalCase.tsx`, `Parent.Section.tsx`, `useThing.ts`, `kebab-subject.role.ts` with roles `helpers · types · constants · styles · data · i18n · shared`, kebab-case directories, colocated tests.

## 6. Dark mode & theming

- Toggle: `next-themes` with `attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange` (`components/providers/QueryProvider.tsx:13`), `<html suppressHydrationWarning>`. Controls: `components/ui/mode-toggle.tsx` and `Sidebar.UserMenu.tsx`.
- Tailwind variant: `@custom-variant dark (&:is(.dark *))` (`globals.css:7`) — `dark:` matches the `.dark` class on `<html>`, not the OS media query.
- Strummy tokens flip under `.dark .theme-strummy` (and `.theme-strummy.theme-dark`, currently unused in TSX). Components using `var(--ink)` etc. need no `dark:` variant; anything using Tailwind palette colours (`text-green-600`, `bg-zinc-…`) **must** carry a `dark:` variant (`.claude/rules/code-style.md`). Prefer the tokens so the variant is unnecessary.
- A 0.3s colour transition on `*` (`globals.css:257`) smooths the switch; `prefers-reduced-motion` collapses all animation to 0.01ms (`:311`).
- Favicons switch by `prefers-color-scheme` (`app/layout.tsx` metadata).

## 7. Icons, motion, copy

| Topic  | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Where                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Icons  | `lucide-react` only (184 files); size `size-4`/`h-4 w-4` inline with text, `h-3.5 w-3.5` in dense rows; `currentColor`. Pass `LucideIcon` as a prop (`EmptyState`, `ListPageHeader`). Brand marks: `--brand-*` tokens, `BrandMark`. The Material Symbols stylesheet in `app/layout.tsx` has no consumers.                                                                                                                                                                                                                                      |                                  |
| Motion | `framer-motion` in 7 components (bottom nav indicator, More menu, swipe rows, full-screen picker, landing reveal, theory mobile). Use the variants in `lib/animations/variants.ts` (`fadeIn`, `listItem`, `slideInBottom`, `hoverLift`, …) wrapped in `safeVariants()` / `safeMotionProps()`, which honour `hooks/useReducedMotion.ts`. CSS motion: `tw-animate-css` (`animate-in`, 15 uses), `--animate-fade-in/shimmer/accordion-*` (`globals.css:70`), `.ui-list-panel` 180ms slide. Durations 150–220ms for UI, 600ms for landing reveals. |                                  |
| Copy   | `next-intl` 4, locales `en`/`pl` (`i18n/locales.ts`), messages in `messages/{en,pl}.json` (29 namespaces: `Common`, `Dashboard`, `Lessons`, `Songs`, `Validation`, `Toasts`, …). Server components `getTranslations('Ns')`, client `useTranslations('Ns')`. **Never hardcode user-visible strings**; add the key to both files. Dates, numbers and statuses follow the viewer's locale (#892).                                                                                                                                                 | `i18n/request.ts`                |
| Toasts | `sonner` `toast()`; one `<Toaster>` per shell.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `components/layout/AppShell.tsx` |

## 8. Do / Don't

- Do wrap any new surface in `theme-strummy` (or render inside the dashboard layout) and style with `var(--ink…)`, `var(--gold…)`, `var(--rule…)` tokens.
- Do put hover/focus/`@media` behaviour in a `ui-*` class or a Tailwind variant; do keep `--cols`-style runtime values as CSS custom properties.
- Do reach for `DataList`, `DesignCard`, `ListPageHeader`, `FormSection`, `EmptyState`, `ToneBadge` before writing a new card or table.
- Do read `components/ui/<name>.tsx` before using a shadcn prop; do pass `dark:` on every Tailwind palette colour.
- Do write mobile-first: the shell splits at `md` (768px), lists collapse at 860px, dialogs become drawers below 768px.
- Don't add inline `style={{…}}` objects or `*.styles.ts` colour maps; don't hardcode hex values outside `design-tokens.css` / `globals.css`.
- Don't hardcode UI strings — every label goes through `next-intl`.
- Don't ship a bare `primitives.tsx`/`helpers.ts`; name the file for its subject (`C6`).
- Don't use the legacy responsive utilities in `globals.css:450+` (`tablet:`, `fhd:`, `ultrawide:`, `iphone:`, …) — zero consumers; use Tailwind breakpoints or a `ui-*` class.
- Don't introduce a second theme, version suffix (`v2/`) or parallel token file — one layer, one file.

## 9. References

- `app/design-tokens.css` — Strummy tokens + `ui-*` classes · `app/globals.css` — Tailwind/shadcn layer, keyframes, safe-area utilities
- `components.json`, `postcss.config.mjs` (no `tailwind.config.*` — Tailwind 4 CSS-first) · `lib/config/dashboard-fonts.ts`, `lib/fonts/`
- `.claude/rules/code-style.md` (naming, size limits, `dark:`, form UX) · `.claude/rules/structure.md` (S1–S10) · `~/.claude/rules/code-quality.md` (no inline styles)
- `docs/app-blueprint/reference/LIST_TABLE_PATTERN.md` (2026-08-09, current) · `FORMS_SPECIFICATION.md` (field inventory, partly stale) · `UI_STANDARDS.md` (2026-07-27, naming section current, token tables stale) · `.interface-design/system.md` (2026-02-01, pre-Strummy palette — historical)
- `docs/app-blueprint/93-design-mockup-audit.md`, `docs/2026-07-23-mockups-vs-implementation.html` — mockup → implementation history
