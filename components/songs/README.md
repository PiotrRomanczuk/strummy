# Songs Components

This directory contains all components, hooks, and types related to song management in the Guitar CRM application.

## Directory Structure

```
songs/
├── SongList/           # Song list view components
│   ├── index.tsx       # Main SongList component
│   ├── Header.tsx      # List header with "Create" button
│   ├── Table.tsx       # Songs table display
│   ├── Empty.tsx       # Empty state component
│   └── Filter.tsx      # Level filter component
├── SongForm/           # Song creation/editing form
│   ├── index.tsx       # Main SongForm wrapper
│   ├── Content.tsx     # Form logic and submission
│   ├── Fields.tsx      # All form fields composition
│   ├── FieldText.tsx   # Text input field component
│   └── FieldSelect.tsx # Select dropdown field component
├── SongDetail/         # Song detail view components
│   ├── index.tsx       # Main SongDetail component
│   ├── Header.tsx      # Song title and author
│   ├── Info.tsx        # Song details (level, key, chords, link)
│   ├── Actions.tsx     # Edit/delete buttons
│   └── useSongDetail.ts # Hook for song detail logic
├── hooks/              # Custom hooks
│   ├── index.ts        # Hook exports
│   ├── useSongList.ts  # Hook for fetching and filtering songs
│   ├── useSongList.helpers.ts # Helper functions for useSongList
│   └── useSong.ts      # Hook for fetching a single song
├── types/              # TypeScript types
│   └── index.ts        # Shared type definitions
├── SongFormGuard.tsx   # Role-based access wrapper for form
└── index.ts            # Main exports

```

## Components

### SongList

Main component for displaying the song library with filtering capabilities.

**Usage:**

```tsx
import { SongList } from '@/components/songs';

<SongList />;
```

**Sub-components:**

- `Header` - Shows title and "Create new song" button (for teachers/admins)
- `Table` - Displays songs in a table format
- `Empty` - Shows when no songs are found
- `Filter` - Allows filtering by difficulty level

### SongForm

Form component for creating and editing songs.

**Usage:**

```tsx
import { SongForm } from '@/components/songs';

<SongForm mode="create" onSuccess={() => router.push('/songs')} />
<SongForm mode="edit" song={existingSong} onSuccess={() => router.push('/songs')} />
```

**Sub-components:**

- `Content` - Handles form state, validation, and submission
- `Fields` - Composes all form fields
- `FieldText` - Reusable text input field
- `FieldSelect` - Reusable select dropdown field

### SongDetail

Component for displaying detailed information about a song.

**Usage:**

```tsx
import { SongDetail } from '@/components/songs';

<SongDetail songId="uuid" onDeleted={() => router.push('/songs')} />;
```

**Sub-components:**

- `Header` - Displays song title and author
- `Info` - Shows level, key, chords, and Ultimate Guitar link
- `Actions` - Edit and delete buttons (for teachers/admins only)

> **Note (2026-08-12):** this whole directory-structure section is stale — the
> `SongList/`, `SongForm/`, and `SongDetail/` subdirectories it describes were
> deleted in the 2026-06-10 v1/v2 cleanup and never rebuilt at these paths.
> The live song-detail page is `SongDetail.tsx` + `SongHero.tsx` (hero
> actions: `SongHero.EditLink.tsx`, `SongHero.DeleteButton.tsx`). This doc
> needs a full pass, not a patch — flagging rather than rewriting it here to
> stay in scope.

### SongFormGuard

Wrapper component that enforces teacher/admin role requirements for the form.

**Usage:**

```tsx
import { SongFormGuard } from '@/components/songs';

<SongFormGuard mode="create" onSuccess={() => router.push('/songs')} />
<SongFormGuard mode="edit" songId="uuid" onSuccess={() => router.push('/songs')} />
```

## Hooks

### useSongList

Hook for fetching and managing the song list with filtering.

**Usage:**

```tsx
import { useSongList } from '@/components/songs';

const { songs, loading, error, filters, setFilters, refresh } = useSongList();
```

**Returns:**

- `songs: SongWithStatus[]` - Array of songs (may include status for students)
- `loading: boolean` - Loading state
- `error: string | null` - Error message if fetch failed
- `filters: SongFilters` - Current filter state
- `setFilters: (filters: SongFilters) => void` - Update filters
- `refresh: () => void` - Manually refresh the song list

### useSong

Hook for fetching a single song by ID.

**Usage:**

```tsx
import { useSong } from '@/components/songs';

const { song, loading, error } = useSong(songId);
```

**Returns:**

- `song: Song | undefined` - The song data
- `loading: boolean` - Loading state
- `error: string | null` - Error message if fetch failed

## Types

All shared types are exported from `types/index.ts`:

```tsx
import type { Song, SongWithStatus, SongLevel, SongFilters, SongStatus } from '@/components/songs';
```

**Type Definitions:**

- `Song` - Base song type from database
- `SongWithStatus` - Song with optional progress status
- `SongLevel` - `'beginner' | 'intermediate' | 'advanced'`
- `SongStatus` - `'to_learn' | 'started' | 'remembered' | 'with_author' | 'mastered'`
- `SongFilters` - Filter object for song queries

## Design Principles

This structure follows the project's "Small Components Policy":

1. **Focused Components** - Each component has a single responsibility
2. **Composability** - Small components combine to build larger features
3. **Co-location** - Related components live together in folders
4. **Reusability** - Form fields and other UI elements are extracted
5. **Separation of Concerns** - Logic (hooks) separated from presentation (components)

## Role-Based Access

Components respect user roles:

- **Teachers/Admins**: Can create, edit, and delete songs
- **Students**: Can only view songs and their assigned progress

Role checks are handled by:

- `useAuth()` hook in components
- `RequireTeacher` wrapper in `SongFormGuard`
- API endpoints enforce server-side validation

## TODO: Future Enhancements

- [ ] Add search functionality to SongList.Filter
- [ ] Add key filter to SongList.Filter
- [ ] Add author filter to SongList.Filter
- [ ] Add sorting options to SongList
- [ ] Add pagination to SongList.Table
- [ ] Add audio file upload to SongForm
- [ ] Add mobile-optimized table view
- [ ] Add bulk operations for teachers
- [ ] Add song duplication feature
- [ ] Add song import from Ultimate Guitar
