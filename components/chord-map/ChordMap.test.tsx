/**
 * ChordMap: the "what if I knew it" loop is the whole interaction — a tile
 * changes what counts as playable, the ranking shows what a shape opens, and
 * "Start over" returns to what the lessons say. Pure presentation given props.
 */
import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import type { ChordMapSong } from '@/lib/services/chord-map';

import { ChordMap } from './ChordMap';

const song = (title: string, shapes: string[]): ChordMapSong => ({
  id: title.toLowerCase().replace(/\s/g, '-'),
  title,
  author: 'Artist',
  shapes,
});

const SONGS = [
  song('Knockin', ['G', 'D', 'Am']),
  song('Let It Be', ['C', 'G', 'Am', 'F']),
  song('Riptide', ['Am', 'G', 'C', 'F']),
  song('Zombie', ['Em', 'C', 'G', 'D']),
];

const renderMap = () =>
  renderWithIntl(<ChordMap songs={SONGS} knownShapes={['G', 'D', 'Am', 'C']} knownSongCount={3} />);

const headline = () => screen.getByText(/songs? you can play today/).parentElement!.parentElement!;

describe('ChordMap', () => {
  it('counts the songs every shape of which the student knows', () => {
    renderMap();
    expect(within(headline()).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Knockin/ })).toHaveAttribute(
      'href',
      '/dashboard/songs/knockin'
    );
  });

  it('ranks F first and lists the songs it opens', async () => {
    renderMap();
    const ranking = screen.getByRole('heading', { name: 'Next shape' }).closest('section')!;
    const rows = within(ranking).getAllByRole('button');
    expect(rows[0]).toHaveTextContent('F');
    expect(rows[0]).toHaveTextContent('+2');

    await userEvent.click(rows[0]);
    expect(screen.getByText('F opens')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Riptide/ })).toBeInTheDocument();
  });

  it('marks a tile known, recounts, and starts over', async () => {
    renderMap();
    const tiles = screen
      .getByRole('heading', { name: 'Shapes in the catalogue' })
      .closest('section')!;
    const tile = within(tiles).getByRole('button', { name: /^F/, pressed: false });
    await userEvent.click(tile);

    expect(within(headline()).getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/these changes are not saved/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(within(headline()).getByText('1')).toBeInTheDocument();
    expect(screen.queryByText(/these changes are not saved/)).not.toBeInTheDocument();
  });

  it('says so when no lesson song had chords to count', () => {
    renderWithIntl(<ChordMap songs={SONGS} knownShapes={[]} knownSongCount={0} />);
    expect(screen.getByText(/No song with written chords/)).toBeInTheDocument();
  });

  it("names the student on the teacher's view", () => {
    renderWithIntl(
      <ChordMap songs={SONGS} knownShapes={[]} knownSongCount={0} studentName="Ala" />
    );
    expect(screen.getByRole('heading', { name: 'Chord map: Ala' })).toBeInTheDocument();
  });
});
