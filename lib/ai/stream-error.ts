/**
 * AI server actions stream plain strings, so a failure travels as a marked
 * chunk rather than a thrown error (a throw across a server action loses its
 * message in production). useAIStream turns the marker back into an error.
 * Without that step the text lands in the form as if the model had written it:
 * a raw OpenRouter 402 was saved as a lesson's notes that way.
 */
const STREAM_ERROR_PREFIX = 'Error: ';

export const toStreamError = (message: string) => `${STREAM_ERROR_PREFIX}${message}`;

export const isStreamError = (chunk: string) => chunk.startsWith(STREAM_ERROR_PREFIX);

export const streamErrorMessage = (chunk: string) => chunk.slice(STREAM_ERROR_PREFIX.length);
