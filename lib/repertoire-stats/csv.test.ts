import { toCsv } from './csv';

describe('toCsv', () => {
  it('quotes cells with commas, quotes and line breaks', () => {
    expect(toCsv(['a'], [['x,y'], ['say "hi"']])).toBe('a\r\n"x,y"\r\n"say ""hi"""\r\n');
  });

  it('prefixes text cells a spreadsheet would run as a formula', () => {
    const rows = [['=1+1'], ['+SUM(A1)'], ['-2+3'], ['@cmd'], ['\tx'], ['\rx']];
    const lines = toCsv(['t'], rows).split('\r\n');
    expect(lines[1]).toBe("'=1+1");
    expect(lines[2]).toBe("'+SUM(A1)");
    expect(lines[3]).toBe("'-2+3");
    expect(lines[4]).toBe("'@cmd");
    expect(toCsv(['t'], [['\tx']])).toBe("t\r\n'\tx\r\n");
    expect(toCsv(['t'], [['\rx']])).toBe('t\r\n"\'\rx"\r\n');
  });

  it('leaves numbers, booleans and ordinary text alone', () => {
    expect(toCsv(['n', 'b', 't'], [[-5, true, 'Little Wing']])).toBe(
      'n,b,t\r\n-5,true,Little Wing\r\n'
    );
  });
});
