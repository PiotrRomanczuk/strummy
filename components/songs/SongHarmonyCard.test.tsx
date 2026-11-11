import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { analyzeHarmony } from '@/lib/music-theory/harmony-analysis';
import { SongHarmonyCard } from './SongHarmonyCard';

jest.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string, values?: Record<string, string>) =>
    values ? `${key} ${Object.values(values).join(' ')}` : key,
}));

const sheet = '[C]a [G]b [Am]c [F]d [C]e [G]f [Am]g [F]h [E]i [Am]j';

const renderCard = async (analysis: ReturnType<typeof analyzeHarmony>) =>
  render(await SongHarmonyCard({ analysis }));

describe('SongHarmonyCard', () => {
  it('shows the key, each degree and why a chord is outside the key', async () => {
    await renderCard(
      analyzeHarmony({
        chords: 'C, G, Am, F, E',
        lyricsWithChords: sheet,
        storedKey: 'C',
        capoFret: 2,
      })
    );

    expect(screen.getByText(/harmonyKey C/)).toHaveTextContent('harmonySounding D');
    expect(screen.getByText('vi')).toBeInTheDocument();
    expect(screen.getByText(/harmonyOutside.secondaryDominant VI/)).toBeInTheDocument();
    expect(screen.getByText(/harmonyProgression/)).toHaveTextContent('harmonyArchetype.Pop');
  });

  it('marks an inferred key as a guess', async () => {
    await renderCard({
      key: 'G',
      isKeyGuess: true,
      soundingKey: null,
      degrees: [],
      archetypes: [],
    });

    expect(screen.getByText('harmonyKeyGuess G')).toBeInTheDocument();
  });

  it('renders nothing without an analysis', async () => {
    const { container } = render((await SongHarmonyCard({ analysis: null })) ?? <></>);

    expect(container).toBeEmptyDOMElement();
  });
});
