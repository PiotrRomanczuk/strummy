import {
  CAGED_ORDER,
  findNoteOnString,
  getActiveCAGEDShapes,
  getScaleNotes,
  getNoteAtFret,
  STANDARD_TUNING,
} from '../index';

describe('findNoteOnString', () => {
  it('finds the lowest fret carrying the note', () => {
    // Low E string: A sits at fret 5.
    expect(findNoteOnString(0, 'A')).toBe(5);
    // Open strings count as fret 0.
    expect(findNoteOnString(0, 'E')).toBe(0);
    // Searching above a floor skips the open string.
    expect(findNoteOnString(0, 'E', 1)).toBe(12);
  });

  it('returns -1 for a string index that does not exist', () => {
    expect(findNoteOnString(9, 'A')).toBe(-1);
  });
});

describe('getActiveCAGEDShapes', () => {
  it('returns shapes ordered from the nut upwards, inside the neck', () => {
    const shapes = getActiveCAGEDShapes('A', 15);
    expect(shapes.length).toBeGreaterThan(0);
    shapes.forEach((shape) => {
      expect(shape.startFret).toBeGreaterThanOrEqual(0);
      expect(shape.endFret).toBeLessThanOrEqual(15);
      expect(shape.endFret).toBeGreaterThan(shape.startFret);
      expect(CAGED_ORDER).toContain(shape.shape);
    });
    const starts = shapes.map((shape) => shape.startFret);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('anchors every shape on its own root note', () => {
    const shapes = getActiveCAGEDShapes('C', 15);
    shapes.forEach((shape) => {
      const anchorString = { C: 1, A: 1, G: 0, E: 0, D: 2 }[shape.shape];
      expect(getNoteAtFret(STANDARD_TUNING[anchorString], shape.rootFret)).toBe('C');
    });
  });

  it('pushes a shape up an octave rather than clipping it at the nut', () => {
    // A on the A string is the open string, so the C-shape (which reaches
    // three frets below its root) has to move to the 12th-fret octave.
    const cShape = getActiveCAGEDShapes('A', 15).find((shape) => shape.shape === 'C');
    expect(cShape).toBeDefined();
    expect(cShape?.rootFret).toBe(12);
    expect(cShape?.startFret).toBe(9);
  });

  it('drops shapes that no longer fit on a short neck', () => {
    const shapes = getActiveCAGEDShapes('A', 6);
    shapes.forEach((shape) => expect(shape.endFret).toBeLessThanOrEqual(6));
  });

  it('lines its shapes up with real scale tones', () => {
    // Every CAGED root is, by construction, the scale root.
    const notes = getScaleNotes('G', 'major');
    getActiveCAGEDShapes('G', 15).forEach((shape) => {
      const anchorString = { C: 1, A: 1, G: 0, E: 0, D: 2 }[shape.shape];
      expect(notes).toContain(getNoteAtFret(STANDARD_TUNING[anchorString], shape.rootFret));
    });
  });
});
