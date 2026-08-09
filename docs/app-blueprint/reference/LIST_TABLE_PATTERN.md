---
created: 2026-08-09
updated: 2026-08-09
---

# List & Table Pattern — the standard for every browsable collection

The songs list (`/dashboard/songs`, shipped in #694) is the reference
implementation. **Lessons, assignments, and every future collection adopt this
contract**, so that a user who learns one list has learned all of them, and a
developer who has implemented one can implement the next without re-deciding
anything.

This document is the contract. `components/songs/SongsList*.tsx` +
`components/songs/songs-list.helpers.ts` are the worked example — read them
alongside this.

> **Scope.** This governs *browsable collections*: a page whose job is to find
> one record among many. It does **not** govern dashboard widgets, admin/debug
> tables (those use the client-side `useSortableTable` hook — see
> [Client-side tables](#client-side-tables-the-other-kind) at the end), or
> anything with fewer than ~10 rows and no filtering.

---

## 1. The one rule everything else follows

> **All list state lives in the URL. The server renders from it. Nothing is
> held in client state.**

Filter, sort, page, and which record is open are query parameters. That single
decision is what makes every behaviour below fall out for free:

- **Shareable** — a filtered, sorted, page-3 view with a record open is one
  copy-pasteable link.
- **Back/forward work** — the browser history *is* the interaction history.
- **No hydration mismatch** — the list is a React Server Component; there is no
  client store to desync.
- **Reload-safe** — refreshing keeps the user exactly where they were.

The corollary, which is the part people get wrong: **never** reach for
`useState` to hold a filter, a sort direction, or a selected row. If it changes
what the user sees in the list, it is a URL parameter.

---

## 2. The URL contract

### Parameter vocabulary

| Param      | Meaning                                | Omitted when          |
| ---------- | -------------------------------------- | --------------------- |
| `search`   | Free-text query across the row's identity fields | empty       |
| `sort`     | Sort key + direction (see below)       | it is the default     |
| `page`     | 1-based page number                    | `1`                   |
| `selected` | Id of the record shown in the panel    | panel closed          |
| *(domain)* | Domain-specific facets                 | unset                 |

Domain-specific facets today: songs use `level`, `key`, `author`, `category`.
Lessons and assignments will use their own (e.g. `status`, `student`) — the
mechanism is identical, only the names differ.

**Omit defaults from the URL.** `?sort=newest&page=1` and `` are the same view,
so only one of them should be reachable. This keeps shared links short and stops
two URLs rendering identically (bad for caching and for tests).

### `buildHref` is the only place URLs are built

Every domain gets exactly one `buildHref(next, current)` in
`<domain>-list.helpers.ts`. Every link in the list — sort headers, pagination,
tabs, row links, the panel's close button — goes through it. No component
concatenates a query string itself.

```ts
export const buildHref = (
  next: Partial<ListFilters>,
  current: ListFilters
): string => {
  const merged = { ...current, ...next };
  // Any change other than `page` or `selected` resets pagination — but
  // opening/closing the panel shouldn't reset the page underneath it.
  const resetsPage = !('page' in next) && !('selected' in next);
  const params = new URLSearchParams();
  /* …set each param, skipping defaults… */
  const page = resetsPage ? 1 : merged.page;
  if (page > 1) params.set('page', String(page));
  if (merged.selected) params.set('selected', merged.selected);
  const qs = params.toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
};
```

**The pagination-reset rule earns its comment.** Changing a *filter* while on
page 7 must return to page 1 — page 7 of the new result set is usually empty,
which reads as "no results" and is the single most common list bug. But
opening or closing the panel is not a filter change: the list underneath is
unchanged, so the page must survive. `page` itself obviously does not reset.

### Parsing is defensive, at the route

The route owns validation. Query strings are user input and arrive as
`string | string[] | undefined`.

- Whitelist enums through a `Set`; anything unrecognised falls back to the
  default rather than reaching the query layer.
- `sort` falls back to the domain default (songs: `newest`).
- `page` falls back to `1` unless it is a positive integer.
- Take the first value of a repeated param (`?sort=a&sort=b` → `a`).

```ts
const pickString = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const parseSort = (v: string | string[] | undefined): ListSort => {
  const raw = pickString(v)?.toLowerCase();
  return raw && SORTS.has(raw as ListSort) ? (raw as ListSort) : 'newest';
};
```

A bad `sort` value must never reach Postgres — that is how you turn a typo in a
URL into a 500.

---

## 3. Behaviours

### 3.1 Filtering

- **Selects apply immediately** on change (`router.push`).
- **Text inputs debounce ~350 ms** and use **`router.replace`**, not `push`.
  Replace is deliberate: typing "beatles" one letter at a time must not leave
  seven history entries the user has to press Back through.
- **No Apply button.** The list is the feedback.
- Every filter change resets to page 1 (via `buildHref`).
- Filter counts (level chips, category tabs) are computed **ignoring their own
  filter** but respecting the others — so a user sees how many rows each option
  holds *before* switching to it. A count that reads `0` for every option except
  the active one is the bug this prevents.

### 3.2 Tabs (a facet with few, data-derived values)

- "All" always leads and carries the unfiltered total.
- Remaining tabs come **from the data**, not from an enum, when the field is
  free text (songs' `category`). Sort by count.
- Clicking the active tab **clears** it — tabs toggle, they do not trap.
- `role="tablist"` / `role="tab"` / `aria-selected`.

### 3.3 Sorting

- Column headings are links, not buttons — sort is navigation.
- Each sortable column maps to an **`[asc, desc]` pair**; clicking an inactive
  column applies `asc`, clicking the active one flips direction.
- The active column shows a direction arrow (`↑` / `↓`) and takes the accent
  colour (`var(--gold-2)`).
- Not every column is sortable. Derived/aggregate columns (songs' "learning"
  count, mastery bar) are not — do not fake it.

```ts
const SORT_PAIRS: Record<SortableCol, [ListSort, ListSort]> = {
  title:  ['title', 'title_desc'],
  author: ['author_asc', 'author_desc'],
  added:  ['oldest', 'newest'],   // reuses the existing default pair
};
```

**Keep legacy sort values working.** Songs' `newest`/`oldest`/`title` predate
the sortable headers and are in people's bookmarks; the `_asc`/`_desc` pairs
were added *alongside* them rather than replacing them. Do the same when
retrofitting an existing list.

> **Known divergence — one param or two?** Songs encode direction into the sort
> value (`sort=title_desc`). Assignments use two params (`sort=title&dir=desc`).
> Both are defensible: two params stay orthogonal and do not double the enum
> per column; one param is what let songs keep its legacy values. **Neither is
> mandated here**, and converging them is not a prerequisite for adopting
> anything else in this document. Revisit only when a third list makes the
> inconsistency actually cost something.

### 3.4 Pagination

- Server-side. Page size is a named constant per domain (`SONGS_PAGE_SIZE = 50`).
- Renders **nothing** when `totalPages <= 1`.
- Prev / "Page X of Y" / Next. Disabled ends use `aria-disabled` plus
  `pointer-events: none` and reduced opacity — the link stays in the DOM so the
  control does not jump around as you page.
- No numbered page links. They cost layout and buy little at this scale.

### 3.5 Clicking a record — the slide-in panel

**This is the behaviour most likely to be got wrong, because it replaced
something simpler.**

A row click **does not navigate to the detail page**. It sets `?selected=<id>`,
which renders a panel beside the list. The list stays put — same scroll
position, same filters, same page.

- Clicking the **already-selected** row clears `selected` (toggles closed).
- The panel is an `<aside>` with `aria-label` of the form
  `"<Domain> detail: <title>"` — it must be findable by accessible name, since
  its content duplicates text that also appears in the list and in the nav.
- It offers **"Open full page"** → the real detail route, for everything the
  panel does not show.
- It offers a **close control** → `buildHref({ selected: undefined }, filters)`.
- The selected row is marked visually: tinted background + an inset accent bar
  on the leading edge (`box-shadow: inset 3px 0 0 var(--gold)`).
- Panel content is a **lighter view** of the detail page, plus the cross-record
  context the detail page cannot cheaply show (who else is learning this song,
  usage stats). It is not a second full detail page.

#### Row markup: the stretched-link trick

A row is a grid of cells with **one absolutely-positioned `<Link>` stretched
across all of them**, carrying `aria-label={title}`. Cells sit above it with
`pointer-events: none`; any interactive cell (a per-row action button)
re-enables `pointer-events: auto`.

```tsx
<div style={wrapperStyle(isSelected)}>
  <div className={`ui-row ${COLUMNS_CLASS}`} style={rowStyle}>
    <Link
      href={buildHref({ selected: isSelected ? undefined : row.id }, filters)}
      aria-label={title}
      aria-current={isSelected ? 'true' : undefined}
      style={stretchedLinkStyle}
    />
    {/* cells — pointer-events: none */}
    {action && <div style={{ position: 'relative' }}>{action}</div>}
  </div>
</div>
```

**Why not wrap the row in a `<Link>`?** Because a `<button>` inside an `<a>` is
invalid HTML and every click on the button would also navigate. This layout is
the reason the row can carry a "want to learn" button at all.

**Consequence for anyone selecting rows (tests included):** the row link has
**no text** — the visible title lives in a sibling cell. `a:has-text("Title")`
matches nothing. Select by accessible name: `getByRole('link', { name: title })`.

### 3.6 Empty states

Distinguish the two cases, because the user's next action differs:

- **Filters active, nothing matched** → "No <things> match" (implying: relax a
  filter).
- **The collection is genuinely empty** → "No <things> yet" (implying: create
  one).

```tsx
const hasFilters = Boolean(filters.search || filters.status /* … */);
return hasFilters ? emptyNoMatch : emptyNoRows;
```

### 3.7 Responsive

- Desktop: a CSS grid whose column template is a **named constant** shared by
  the header row and the data rows, so they cannot drift apart. Two variants —
  with and without the trailing action column.
- Below `md`: collapse to one column and render a **single combined meta line**
  (e.g. `author · level · key`) instead of a stack of unlabelled cells. Column
  headers hide entirely.

---

## 4. File layout per domain

Mirror this structure; the names are load-bearing (`C6` in
`npm run check:structure` enforces the shapes).

```
components/<domain>/
├── <Domain>List.tsx              # orchestration: filters → header+rows → pagination, panel beside
├── <Domain>List.Header.tsx       # sortable column headings
├── <Domain>List.Row.tsx          # one row (stretched link + cells)
├── <Domain>List.Filters.tsx      # server-rendered filter bar shell
├── <Domain>List.FiltersForm.tsx  # 'use client' — the inputs that push/replace
├── <Domain>List.Pagination.tsx
├── <Domain>List.Panel.tsx        # slide-in detail
├── <domain>-list.helpers.ts      # buildHref + option constants  ← the contract
└── <domain>-row.styles.ts        # COLUMNS_CLASS + cell styles
```

And the query layer:

```
lib/services/<domain>-list-queries.ts   # Filters/Sort types, PAGE_SIZE, breakdown counts
```

**What is shared vs. copied.** Shared primitives live in `components/shared/`
(the URL/sort/pagination mechanics and the panel shell). The `Row` and the
`Panel` *body* stay per-domain: their columns and their content have nothing in
common, and forcing them behind one generic `<DataList columns={…}>` would
reintroduce exactly the over-abstraction `structure.md` was written to stop.
Duplicating a 40-line row component across three domains is the cheaper mistake.

---

## 5. E2E contract

Every list ships Playwright coverage of these, **for each role that can reach
it** (admin / teacher / student — see `.claude/rules/playwright-testing.md`):

| # | Behaviour                                                             |
| - | --------------------------------------------------------------------- |
| 1 | Row click opens the panel and puts `selected=<id>` in the URL          |
| 2 | Panel shows the values the record was created with                     |
| 3 | "Open full page" reaches the real detail route                         |
| 4 | Close clears `selected` and leaves the rest of the query string intact |
| 5 | A filter/tab narrows the list and resets to page 1                     |
| 6 | A sortable header reorders, and clicking again reverses                |
| 7 | Role differences: student-only action present, edit link absent, etc.  |

**Selector rules** — these are the two that break every time:

- Rows: `getByRole('link', { name: <title> })`. Never `a:has-text(…)` (the link
  has no text), never `a[href*="/dashboard/<domain>/"]` (row links point at
  `?selected=`, not the detail route).
- Panel contents: scope to the panel, `getByRole('complementary', { name: '<Domain> detail: <title>' })`.
  Values shown in the panel usually *also* appear in a tab strip or the nav, so
  an unscoped locator is ambiguous.

Seed a record with known values inside the test and delete it in `finally` —
`.first()` on a shared list races against every other spec.

---

## 6. Adoption checklist

- [ ] All state in the URL; nothing in `useState`
- [ ] One `buildHref`; every link routes through it
- [ ] Defaults omitted from the query string
- [ ] Filter change resets `page`; `selected` change does not
- [ ] Route parses defensively, whitelists enums, falls back to defaults
- [ ] Selects push; text debounces + `replace`
- [ ] Facet counts ignore their own filter
- [ ] Sortable headers are links with `[asc, desc]` pairs + direction arrow
- [ ] Legacy sort values still resolve
- [ ] Pagination hidden at ≤ 1 page; ends `aria-disabled`
- [ ] Row = stretched link with `aria-label`, cells `pointer-events: none`
- [ ] Row click toggles `?selected=`; selected row visually marked
- [ ] Panel: `aria-label` "<Domain> detail: <title>", Open full page, Close
- [ ] Empty state distinguishes "no match" from "none yet"
- [ ] Mobile: one column + combined meta line
- [ ] Grid template shared between header and rows
- [ ] E2E: the 7 behaviours above, per role
- [ ] `npm run check:structure` clean

---

## Client-side tables — the other kind

Admin and debug tables (`ImportLogsTable`, `AIGenerationHistory.Table`,
`StudentHealthTable`, the debug panels) sort **in the client** via
`hooks/useSortableTable.ts` + `components/ui/sortable-table-head.tsx`, shipped
in #689. That is correct for them and must not be "upgraded":

- They hold tens of rows, already fully loaded — a round trip to re-sort would
  be strictly worse.
- They are operator tools. Nobody shares a link to page 3 of the import log.
- They have no detail panel, so there is no `selected` to carry.

**The dividing line:** if the collection is paginated server-side, or a user
would ever share a link to a particular view of it, it follows this document.
Otherwise `useSortableTable` is the right tool.

---

## See also

- `components/songs/` — the reference implementation
- [UI_STANDARDS.md](UI_STANDARDS.md) — tokens, spacing, typography
- [../91-testing-strategy.md](../91-testing-strategy.md) — how any of this gets proven
- [../../../.claude/rules/structure.md](../../../.claude/rules/structure.md) — why the shared/copied split is drawn where it is
