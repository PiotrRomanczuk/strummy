/**
 * One RFC 4180 line → fields. The hub's CSVs (Chordonomicon, Billboard, McGill, Groove MIDI, the
 * analyze benchmark) quote fields that contain commas and double their inner quotes; none of them
 * break a record across lines, so a line-by-line reader is enough.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

export function csvRecord(header: string[], line: string): Record<string, string> {
  const values = parseCsvLine(line);
  return Object.fromEntries(header.map((name, i) => [name, values[i] ?? '']));
}
