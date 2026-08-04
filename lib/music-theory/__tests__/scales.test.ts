import {
  SCALE_DEFINITIONS,
  getScaleNotes,
  isNoteInScale,
  getNoteDegree,
  getScaleStepFormula,
} from '../scales';
import { CHROMATIC_NOTES, type NoteName } from '../notes';

describe('SCALE_DEFINITIONS', () => {
  const scaleKeys = Object.keys(SCALE_DEFINITIONS);

  it('has at least 10 scale types', () => {
    expect(scaleKeys.length).toBeGreaterThanOrEqual(10);
  });

  it('all scales have valid intervals starting with 0', () => {
    for (const key of scaleKeys) {
      const scale = SCALE_DEFINITIONS[key];
      expect(scale.intervals[0]).toBe(0);
    }
  });

  it('all intervals are between 0 and 11', () => {
    for (const key of scaleKeys) {
      const scale = SCALE_DEFINITIONS[key];
      for (const interval of scale.intervals) {
        expect(interval).toBeGreaterThanOrEqual(0);
        expect(interval).toBeLessThanOrEqual(11);
      }
    }
  });

  it('intervals are in ascending order', () => {
    for (const key of scaleKeys) {
      const scale = SCALE_DEFINITIONS[key];
      for (let i = 1; i < scale.intervals.length; i++) {
        expect(scale.intervals[i]).toBeGreaterThan(scale.intervals[i - 1]);
      }
    }
  });

  it('all scales have name and description', () => {
    for (const key of scaleKeys) {
      const scale = SCALE_DEFINITIONS[key];
      expect(scale.name).toBeTruthy();
      expect(typeof scale.name).toBe('string');
      expect(scale.description).toBeTruthy();
      expect(typeof scale.description).toBe('string');
    }
  });

  it('major scale has 7 notes', () => {
    expect(SCALE_DEFINITIONS.major.intervals).toHaveLength(7);
  });

  it('pentatonic scales have 5 notes', () => {
    expect(SCALE_DEFINITIONS.pentatonic_major.intervals).toHaveLength(5);
    expect(SCALE_DEFINITIONS.pentatonic_minor.intervals).toHaveLength(5);
  });

  it('chromatic scale has 12 notes', () => {
    expect(SCALE_DEFINITIONS.chromatic.intervals).toHaveLength(12);
  });

  it('blues scale has 6 notes', () => {
    expect(SCALE_DEFINITIONS.blues.intervals).toHaveLength(6);
  });
});

describe('getScaleNotes', () => {
  it('returns C major scale notes', () => {
    expect(getScaleNotes('C', 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('returns A minor pentatonic', () => {
    expect(getScaleNotes('A', 'pentatonic_minor')).toEqual(['A', 'C', 'D', 'E', 'G']);
  });

  it('returns empty for unknown scale key', () => {
    expect(getScaleNotes('C', 'nonexistent_scale')).toEqual([]);
  });

  it('transposes correctly -- G major', () => {
    expect(getScaleNotes('G', 'major')).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
  });

  it('transposes correctly -- D major', () => {
    expect(getScaleNotes('D', 'major')).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
  });

  it('chromatic scale returns all 12 notes starting from root', () => {
    const notes = getScaleNotes('C', 'chromatic');
    expect(notes).toHaveLength(12);
    expect(notes[0]).toBe('C');
    expect(notes).toEqual([...CHROMATIC_NOTES]);
  });

  it('chromatic scale from E returns all 12 notes starting from E', () => {
    const notes = getScaleNotes('E', 'chromatic');
    expect(notes).toHaveLength(12);
    expect(notes[0]).toBe('E');
  });

  it('blues scale has 6 notes', () => {
    const notes = getScaleNotes('A', 'blues');
    expect(notes).toHaveLength(6);
    expect(notes).toEqual(['A', 'C', 'D', 'D#', 'E', 'G']);
  });

  it('natural minor returns correct notes for A', () => {
    expect(getScaleNotes('A', 'natural_minor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('E minor pentatonic returns correct notes', () => {
    expect(getScaleNotes('E', 'pentatonic_minor')).toEqual(['E', 'G', 'A', 'B', 'D']);
  });

  it('all returned notes are valid NoteName values', () => {
    for (const scaleKey of Object.keys(SCALE_DEFINITIONS)) {
      for (const root of CHROMATIC_NOTES) {
        const notes = getScaleNotes(root, scaleKey);
        for (const note of notes) {
          expect(CHROMATIC_NOTES).toContain(note);
        }
      }
    }
  });

  it('first note is always the root', () => {
    for (const scaleKey of Object.keys(SCALE_DEFINITIONS)) {
      for (const root of CHROMATIC_NOTES) {
        const notes = getScaleNotes(root, scaleKey);
        if (notes.length > 0) {
          expect(notes[0]).toBe(root);
        }
      }
    }
  });
});

describe('isNoteInScale', () => {
  it('returns true for notes in scale', () => {
    expect(isNoteInScale('C', 'C', 'major')).toBe(true);
    expect(isNoteInScale('D', 'C', 'major')).toBe(true);
    expect(isNoteInScale('E', 'C', 'major')).toBe(true);
    expect(isNoteInScale('G', 'C', 'major')).toBe(true);
  });

  it('returns false for notes not in scale', () => {
    expect(isNoteInScale('C#', 'C', 'major')).toBe(false);
    expect(isNoteInScale('D#', 'C', 'major')).toBe(false);
    expect(isNoteInScale('F#', 'C', 'major')).toBe(false);
  });

  it('returns false for unknown scale', () => {
    expect(isNoteInScale('C', 'C', 'nonexistent')).toBe(false);
  });

  it('all notes are in the chromatic scale', () => {
    for (const note of CHROMATIC_NOTES) {
      expect(isNoteInScale(note, 'C', 'chromatic')).toBe(true);
    }
  });

  it('root is always in any valid scale', () => {
    for (const scaleKey of Object.keys(SCALE_DEFINITIONS)) {
      for (const root of CHROMATIC_NOTES) {
        expect(isNoteInScale(root, root, scaleKey)).toBe(true);
      }
    }
  });

  it('A pentatonic minor contains correct notes', () => {
    const inScale: NoteName[] = ['A', 'C', 'D', 'E', 'G'];
    const notInScale: NoteName[] = ['A#', 'B', 'C#', 'D#', 'F', 'F#', 'G#'];
    for (const note of inScale) {
      expect(isNoteInScale(note, 'A', 'pentatonic_minor')).toBe(true);
    }
    for (const note of notInScale) {
      expect(isNoteInScale(note, 'A', 'pentatonic_minor')).toBe(false);
    }
  });
});

describe('getNoteDegree', () => {
  it('returns 1 for root note', () => {
    expect(getNoteDegree('C', 'C', 'major')).toBe(1);
  });

  it('returns correct degree for other notes in C major', () => {
    expect(getNoteDegree('D', 'C', 'major')).toBe(2);
    expect(getNoteDegree('E', 'C', 'major')).toBe(3);
    expect(getNoteDegree('F', 'C', 'major')).toBe(4);
    expect(getNoteDegree('G', 'C', 'major')).toBe(5);
    expect(getNoteDegree('A', 'C', 'major')).toBe(6);
    expect(getNoteDegree('B', 'C', 'major')).toBe(7);
  });

  it('returns 0 for notes not in scale', () => {
    expect(getNoteDegree('C#', 'C', 'major')).toBe(0);
    expect(getNoteDegree('F#', 'C', 'major')).toBe(0);
  });

  it('returns 0 for unknown scale', () => {
    expect(getNoteDegree('C', 'C', 'nonexistent')).toBe(0);
  });

  it('returns 1 for root in any valid scale', () => {
    for (const scaleKey of Object.keys(SCALE_DEFINITIONS)) {
      expect(getNoteDegree('A', 'A', scaleKey)).toBe(1);
    }
  });

  it('returns correct degrees for G major', () => {
    const gMajor: NoteName[] = ['G', 'A', 'B', 'C', 'D', 'E', 'F#'];
    gMajor.forEach((note, idx) => {
      expect(getNoteDegree(note, 'G', 'major')).toBe(idx + 1);
    });
  });

  it('pentatonic scales have degrees 1-5', () => {
    const notes = getScaleNotes('E', 'pentatonic_minor');
    notes.forEach((note, idx) => {
      expect(getNoteDegree(note, 'E', 'pentatonic_minor')).toBe(idx + 1);
    });
  });
});

describe('getScaleStepFormula', () => {
  it('major scale is W-W-H-W-W-W-H', () => {
    expect(getScaleStepFormula('major')).toBe('W-W-H-W-W-W-H');
  });

  it('natural minor scale is W-H-W-W-H-W-W', () => {
    expect(getScaleStepFormula('natural_minor')).toBe('W-H-W-W-H-W-W');
  });

  it('pentatonic minor uses whole-and-a-half steps', () => {
    expect(getScaleStepFormula('pentatonic_minor')).toBe('WH-W-W-WH-W');
  });

  it('chromatic scale is all half steps', () => {
    expect(getScaleStepFormula('chromatic')).toBe(Array(12).fill('H').join('-'));
  });

  it('returns empty string for an unknown scale', () => {
    expect(getScaleStepFormula('nonexistent')).toBe('');
  });

  it('every scale formula has one step per interval', () => {
    for (const key of Object.keys(SCALE_DEFINITIONS)) {
      const steps = getScaleStepFormula(key).split('-');
      expect(steps).toHaveLength(SCALE_DEFINITIONS[key].intervals.length);
    }
  });
});
