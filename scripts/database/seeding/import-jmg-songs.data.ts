/**
 * Canonical names for the abbreviations used in the JMG content plan
 * (docs/marketing/tiktok/songs.yaml). The YAML was a filming checklist, so
 * titles like "Hotel Cali Solo" were shorthand; Strummy's catalogue stores the
 * real song. Keys are matched exactly (after trim); anything not listed is
 * imported as written. "… Solo" entries map to the song itself — a solo video
 * is content about that song, not a separate catalogue entry.
 */

export const TITLE_CANONICAL: Record<string, string> = {
  'Hotel Cali Solo': 'Hotel California',
  'Stairway Solo': 'Stairway to Heaven',
  'Comfortably Numb Solo': 'Comfortably Numb',
  'House Rising Sun': 'House of the Rising Sun',
  'Bridge Over Troubled': 'Bridge Over Troubled Water',
  'Sweet Child O Mine': "Sweet Child O' Mine",
  'Sound of Silence': 'The Sound of Silence',
  'Country Roads': 'Take Me Home, Country Roads',
  'Good Riddance': 'Good Riddance (Time of Your Life)',
  "Don't Think Twice": "Don't Think Twice, It's All Right",
  'Father & Son': 'Father and Son',
  'Never Going Back': 'Never Going Back Again',
};

export const ARTIST_CANONICAL: Record<string, string> = {
  Beatles: 'The Beatles',
  Animals: 'The Animals',
  'Rolling Stones': 'The Rolling Stones',
  RHCP: 'Red Hot Chili Peppers',
  GnR: "Guns N' Roses",
  'Guns N Roses': "Guns N' Roses",
  'Ben E King': 'Ben E. King',
};
