import { firstGuitarTrack, midiNote, tabKind, techniquesLabel, tuningLabel } from './lab-tabs.helpers';

describe('lab tab helpers', () => {
  it('names MIDI notes and reads a tuning low to high', () => {
    expect(midiNote(40)).toBe('E2');
    expect(midiNote(61)).toBe('C#4');
    expect(tuningLabel([64, 59, 55, 50, 45, 38])).toBe('D2 A2 D3 G3 B3 E4');
  });

  it('lists techniques most used first', () => {
    expect(techniquesLabel({ slide: 2, palm_mute: 9 })).toBe('palm mute 9 · slide 2');
    expect(techniquesLabel(undefined)).toBe('');
  });

  it('starts on the first played guitar part', () => {
    const vocals = { notes: 400, tuning: [64, 59, 55, 50, 45, 40], instrument: 52 };
    const drums = { notes: 900, tuning: [], percussion: true };
    const guitar = { notes: 1500, tuning: [64, 59, 55, 50, 45, 40], instrument: 29 };
    expect(firstGuitarTrack([vocals, drums, guitar])).toBe(2);
    expect(firstGuitarTrack([drums, vocals])).toBe(1);
    expect(firstGuitarTrack([])).toBe(0);
  });

  it('accepts only known tab kinds', () => {
    expect(tabKind('exercises')).toBe('exercises');
    expect(tabKind('anything')).toBe('all');
  });
});
