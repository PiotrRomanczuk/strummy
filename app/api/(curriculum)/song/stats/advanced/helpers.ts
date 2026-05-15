import * as ss from 'simple-statistics';
import type {
  SongStatsTempoStats,
  SongStatsKeyDistribution,
  SongStatsGrowthMonth,
  SongStatsSunburstNode,
  SongStatsReleaseYear,
} from '@/types/SongStatsAdvanced';

interface SongRow {
  title: string;
  author: string | null;
  level: string | null;
  key: string | null;
  tempo: number | null;
  category: string | null;
  release_year: number | null;
  chords: string | null;
  strumming_pattern: string | null;
  audio_files: unknown;
  youtube_url: string | null;
  spotify_link_url: string | null;
  created_at: string;
}

const TEMPO_BUCKETS = [
  { min: 40, max: 60, label: '40-60' },
  { min: 60, max: 80, label: '60-80' },
  { min: 80, max: 100, label: '80-100' },
  { min: 100, max: 120, label: '100-120' },
  { min: 120, max: 140, label: '120-140' },
  { min: 140, max: 160, label: '140-160' },
  { min: 160, max: 180, label: '160-180' },
  { min: 180, max: Infinity, label: '180+' },
];

const MINOR_SUFFIX = 'm';

const METADATA_FIELDS: (keyof SongRow)[] = [
  'author', 'level', 'key', 'tempo', 'category',
  'chords', 'strumming_pattern', 'release_year',
];

export function computeOverview(songs: SongRow[]) {
  const authors = new Set(songs.map((s) => s.author).filter(Boolean));
  const categories = new Set(songs.map((s) => s.category).filter(Boolean));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = songs.filter((s) => new Date(s.created_at) >= thirtyDaysAgo).length;

  let totalFilled = 0;
  const totalPossible = songs.length * METADATA_FIELDS.length;
  for (const song of songs) {
    for (const field of METADATA_FIELDS) {
      if (song[field] != null && song[field] !== '') totalFilled++;
    }
  }

  return {
    totalSongs: songs.length,
    uniqueAuthors: authors.size,
    uniqueCategories: categories.size,
    metadataCompleteness: totalPossible > 0
      ? Math.round((totalFilled / totalPossible) * 1000) / 10
      : 0,
    recentSongs30d: recent,
    avgSongsPerAuthor: authors.size > 0
      ? Math.round((songs.length / authors.size) * 100) / 100
      : 0,
  };
}

export function computeTempoStats(songs: SongRow[]): SongStatsTempoStats {
  const tempos = songs.map((s) => s.tempo).filter((t): t is number => t != null && t > 0);

  if (tempos.length === 0) {
    return {
      mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
      songsWithTempo: 0, histogram: [],
    };
  }

  const histogram = TEMPO_BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    count: tempos.filter((t) =>
      t >= bucket.min && (bucket.max === Infinity ? true : t < bucket.max)
    ).length,
  })).filter((b) => b.count > 0);

  return {
    mean: Math.round(ss.mean(tempos) * 10) / 10,
    median: ss.median(tempos),
    stdDev: Math.round(ss.standardDeviation(tempos) * 10) / 10,
    min: ss.min(tempos),
    max: ss.max(tempos),
    songsWithTempo: tempos.length,
    histogram,
  };
}

export function computeKeyDistribution(songs: SongRow[]): SongStatsKeyDistribution[] {
  const keyCounts: Record<string, number> = {};
  for (const song of songs) {
    if (song.key) {
      keyCounts[song.key] = (keyCounts[song.key] || 0) + 1;
    }
  }

  return Object.entries(keyCounts).map(([key, count]) => ({
    key,
    count,
    isMajor: !key.endsWith(MINOR_SUFFIX) || key.length <= 1,
  }));
}

export function computeLevelDistribution(songs: SongRow[]) {
  const counts: Record<string, number> = {};
  for (const song of songs) {
    const level = song.level || 'Unknown';
    counts[level] = (counts[level] || 0) + 1;
  }
  return Object.entries(counts).map(([level, count]) => ({ level, count }));
}

export function computeCategoryDistribution(songs: SongRow[]) {
  const counts: Record<string, number> = {};
  for (const song of songs) {
    const category = song.category || 'Uncategorized';
    counts[category] = (counts[category] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeLibraryGrowth(songs: SongRow[]): SongStatsGrowthMonth[] {
  const monthly: Record<string, number> = {};
  for (const song of songs) {
    const d = new Date(song.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + 1;
  }

  const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  return sorted.map(([month, newSongs]) => {
    cumulative += newSongs;
    return { month, newSongs, cumulative };
  });
}

export function computeSunburst(songs: SongRow[]): SongStatsSunburstNode {
  const tree: Record<string, Record<string, Record<string, number>>> = {};

  for (const song of songs) {
    const level = song.level || 'Unknown';
    const category = song.category || 'Uncategorized';
    const key = song.key || 'Unknown';

    tree[level] = tree[level] || {};
    tree[level][category] = tree[level][category] || {};
    tree[level][category][key] = (tree[level][category][key] || 0) + 1;
  }

  return {
    name: 'Songs',
    children: Object.entries(tree).map(([level, categories]) => ({
      name: level,
      children: Object.entries(categories).map(([category, keys]) => ({
        name: category,
        children: Object.entries(keys).map(([key, count]) => ({
          name: key,
          value: count,
        })),
      })),
    })),
  };
}

export function computeReleaseYearStats(songs: SongRow[]): SongStatsReleaseYear {
  const years = songs
    .map((s) => s.release_year)
    .filter((y): y is number => y != null && y > 0);

  if (years.length === 0) {
    return { decades: [], earliest: null, latest: null, median: null };
  }

  const decadeCounts: Record<string, number> = {};
  for (const y of years) {
    const decade = `${Math.floor(y / 10) * 10}s`;
    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
  }

  const decades = Object.entries(decadeCounts)
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade.localeCompare(b.decade));

  return {
    decades,
    earliest: ss.min(years),
    latest: ss.max(years),
    median: Math.round(ss.median(years)),
  };
}
