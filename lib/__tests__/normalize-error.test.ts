import pino from 'pino';
import { normalizeErrorArg, isErrorLike } from '@/lib/logger/normalize-error';
import { __internal } from '@/lib/logger/supabase-destination';

describe('normalizeErrorArg', () => {
  it('passes a real Error through untouched', () => {
    const err = new Error('boom');
    expect(normalizeErrorArg(err)).toEqual({ error: err });
  });

  it('passes an error-like object (PostgrestError) through untouched', () => {
    const pgError = { message: 'duplicate key value', code: '23505', details: null };
    expect(normalizeErrorArg(pgError)).toEqual({ error: pgError });
  });

  it('unwraps the bare `{ error }` wrapper', () => {
    const err = new Error('boom');
    expect(normalizeErrorArg({ error: err })).toEqual({ error: err, extraContext: undefined });
  });

  it('unwraps a wrapper and keeps the sibling fields as context', () => {
    const err = new Error('boom');
    expect(normalizeErrorArg({ studentId: 'abc', error: err })).toEqual({
      error: err,
      extraContext: { studentId: 'abc' },
    });
  });

  it('unwraps a renamed error field', () => {
    const insertError = { message: 'insert failed' };
    expect(normalizeErrorArg({ error: insertError, songId: 's1' })).toEqual({
      error: insertError,
      extraContext: { songId: 's1' },
    });
  });

  it.each(['err', 'cause', 'exception'])('recognises `%s` as the error key', (key) => {
    const err = new Error('boom');
    expect(normalizeErrorArg({ [key]: err })).toEqual({ error: err, extraContext: undefined });
  });

  it('treats a wrapper with no error field as pure context', () => {
    expect(normalizeErrorArg({ localUrl: 'http://a', remoteUrl: 'http://b' })).toEqual({
      error: undefined,
      extraContext: { localUrl: 'http://a', remoteUrl: 'http://b' },
    });
  });

  it('accepts a string error message inside a wrapper', () => {
    expect(normalizeErrorArg({ error: 'timed out', code: 'ETIMEDOUT' })).toEqual({
      error: 'timed out',
      extraContext: { code: 'ETIMEDOUT' },
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'plain failure'],
    ['a number', 500],
  ])('passes %s through untouched', (_label, value) => {
    expect(normalizeErrorArg(value)).toEqual({ error: value });
  });

  it('prefers the object itself when it is both error-like and has an error field', () => {
    const arg = { message: 'outer', error: 'inner' };
    expect(normalizeErrorArg(arg)).toEqual({ error: arg });
  });
});

describe('isErrorLike', () => {
  it.each([
    ['an Error', new Error('x'), true],
    ['a PostgrestError shape', { message: 'x', code: '1' }, true],
    ['a stack-only object', { stack: 'at foo' }, true],
    ['a context wrapper', { studentId: 'a' }, false],
    ['null', null, false],
    ['a string', 'x', false],
    ['an array', [1, 2], false],
  ])('%s', (_label, value, expected) => {
    expect(isErrorLike(value)).toBe(expected);
  });
});

/**
 * Regression guard for the actual defect: a wrapper-shaped error used to land
 * in `system_logs` as `message: '[object Object]'` with a null context.
 */
describe('system_logs row shape', () => {
  function rowFor(errArg: unknown, context?: Record<string, unknown>) {
    const lines: string[] = [];
    const log = pino({ base: { app: 'strummy' }, timestamp: pino.stdTimeFunctions.isoTime }, {
      write: (chunk: string) => {
        lines.push(chunk);
        return true;
      },
    } as never).child({ prefix: 'test' });

    const { error, extraContext } = normalizeErrorArg(errArg);
    log.error({ ...extraContext, ...context, err: error }, 'Failed to insert lesson');

    return __internal.pinoLogToRow(JSON.parse(lines[0]));
  }

  it('keeps the real message when the error arrives wrapped in context', () => {
    const row = rowFor({
      studentId: 'abc',
      error: { message: 'duplicate key value', code: '23505' },
    });

    expect(row?.error).toMatchObject({ message: 'duplicate key value' });
    expect(row?.error?.message).not.toBe('[object Object]');
    expect(row?.context).toMatchObject({ studentId: 'abc' });
  });

  it('keeps the stack when a real Error arrives wrapped', () => {
    const row = rowFor({ error: new Error('boom') });

    expect(row?.error).toMatchObject({ message: 'boom' });
    expect(row?.error?.stack).toEqual(expect.stringContaining('Error: boom'));
  });

  it('records context-only calls without inventing an error', () => {
    const row = rowFor({ localUrl: 'http://a', remoteUrl: 'http://b' });

    expect(row?.error).toBeNull();
    expect(row?.context).toMatchObject({ localUrl: 'http://a', remoteUrl: 'http://b' });
  });

  it('never serializes an error as [object Object]', () => {
    const row = rowFor({ error: { unusual: 'shape', without: 'a message' } });

    expect(row?.error?.message).not.toBe('[object Object]');
    expect(row?.error?.message).toContain('unusual');
  });
});
