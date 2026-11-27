/**
 * Synthetic responses shaped like the ones observed in the inFakt sandbox
 * (2026-11-16). Invented names and numbers only; used by unit tests.
 */
import type { FetchLike } from './infakt-types';

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface FakeReply {
  status: number;
  /** Object is JSON-encoded; a string is sent as-is (for non-JSON bodies). */
  body?: unknown;
}

export const buyerFixture = { firstName: 'Jan', lastName: 'Testowy', city: 'Miastowo' };

export const documentFixture = {
  id: 1001,
  uuid: '0b1c2d3e-aaaa-bbbb-cccc-000000000001',
  number: '1/11/2026',
  kind: 'vat',
  status: 'draft',
  gross_price: 40000,
  paid_price: 0,
  left_to_pay: 40000,
  paid_date: null,
};

export const paidDocumentFixture = { ...documentFixture, status: 'paid', paid_date: '2026-11-20' };

export const errorFixtures = {
  unauthorized: { error: 'Invalid API key.' },
  notFound: { error: 'Resource not found.' },
  validation: { error: 'Validation failed', errors: { vat_exemption_reason: ['is missing'] } },
  invalidResource: { errors: { invalid_resource: 'Document cannot be processed.' } },
  noBankAccount: {
    error: 'Validation failed',
    errors: { bank_account: ['Enter a valid account number.'], bank_name: ["can't be blank"] },
  },
};

/** A fetch that answers from a queue and records every call. */
export function createFakeFetch(replies: Array<FakeReply | Error>) {
  const calls: RecordedCall[] = [];
  const queue = [...replies];

  const fetchFake: FetchLike = async (url, init) => {
    const reply = queue.shift();
    if (!reply) throw new Error(`Unexpected request: ${url}`);
    calls.push({
      url,
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body ? (JSON.parse(init.body) as unknown) : undefined,
    });
    if (reply instanceof Error) throw reply;
    const text =
      reply.body === undefined
        ? ''
        : typeof reply.body === 'string'
          ? reply.body
          : JSON.stringify(reply.body);
    return { status: reply.status, text: async () => text };
  };

  return { fetch: fetchFake, calls };
}
