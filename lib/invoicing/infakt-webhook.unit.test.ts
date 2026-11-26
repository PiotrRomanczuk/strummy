/**
 * @jest-environment node
 */
import { createHmac } from 'node:crypto';
import { verifyInfaktSignature } from './infakt-webhook';

const secret = 'test-webhook-secret';
const rawBody = '{"event":"invoice_paid","invoice":{"id":1001}}';
const sign = (body: string, key = secret) => createHmac('sha256', key).update(body).digest('hex');

describe('verifyInfaktSignature', () => {
  it('accepts a valid signature', () => {
    expect(verifyInfaktSignature({ rawBody, signature: sign(rawBody), secret })).toBe(true);
  });

  it('accepts uppercase hex and surrounding whitespace', () => {
    const signature = ` ${sign(rawBody).toUpperCase()} `;
    expect(verifyInfaktSignature({ rawBody, signature, secret })).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = sign(rawBody);
    expect(
      verifyInfaktSignature({ rawBody: rawBody.replace('1001', '1002'), signature, secret })
    ).toBe(false);
  });

  it('rejects a signature made with another secret', () => {
    expect(verifyInfaktSignature({ rawBody, signature: sign(rawBody, 'other'), secret })).toBe(
      false
    );
  });

  it('rejects a signature of the wrong length or not hex, without throwing', () => {
    expect(verifyInfaktSignature({ rawBody, signature: sign(rawBody).slice(0, 62), secret })).toBe(
      false
    );
    expect(verifyInfaktSignature({ rawBody, signature: `${sign(rawBody)}00`, secret })).toBe(false);
    expect(verifyInfaktSignature({ rawBody, signature: 'z'.repeat(64), secret })).toBe(false);
  });

  it('rejects a missing header or an empty secret', () => {
    expect(verifyInfaktSignature({ rawBody, signature: null, secret })).toBe(false);
    expect(verifyInfaktSignature({ rawBody, signature: undefined, secret })).toBe(false);
    expect(verifyInfaktSignature({ rawBody, signature: sign(rawBody, ''), secret: '' })).toBe(
      false
    );
  });
});
