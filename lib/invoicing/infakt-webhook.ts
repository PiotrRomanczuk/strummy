import { createHmac, timingSafeEqual } from 'node:crypto';

const SHA256_HEX = /^[0-9a-f]{64}$/i;

export interface SignatureCheck {
  /** The raw request body, byte for byte (never re-serialised JSON). */
  rawBody: string;
  /** Value of the `X-Infakt-Signature` header, if any. */
  signature: string | null | undefined;
  secret: string;
}

/** HMAC-SHA256 of the raw body, compared in constant time. False on any doubt. */
export function verifyInfaktSignature({ rawBody, signature, secret }: SignatureCheck): boolean {
  if (!secret || !signature) return false;
  const provided = signature.trim();
  if (!SHA256_HEX.test(provided)) return false;

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  return timingSafeEqual(expected, Buffer.from(provided, 'hex'));
}
