/**
 * @jest-environment node
 */
import { buildInfaktClient, createInfaktClient } from './infakt-client';
import { infaktConfigSchema, INFAKT_SANDBOX_URL } from './infakt-config';
import { isPaid } from './infakt-documents';
import {
  buyerFixture,
  createFakeFetch,
  documentFixture,
  errorFixtures,
  paidDocumentFixture,
  type FakeReply,
} from './infakt-fixtures';

const config = infaktConfigSchema.parse({
  apiKey: 'test-key-not-real',
  baseUrl: INFAKT_SANDBOX_URL,
  documentKind: 'vat',
  vatRate: '23',
  paymentTermDays: 7,
});
const exemptConfig = infaktConfigSchema.parse({
  ...config,
  documentKind: 'proforma',
  vatRate: 'zw',
  exemptionReasonId: 4,
});
const fixedNow = () => new Date('2026-11-22T10:00:00Z');

function clientWith(replies: Array<FakeReply | Error>, cfg = config) {
  const fake = createFakeFetch(replies);
  return {
    client: buildInfaktClient(cfg, { fetch: fake.fetch, now: fixedNow }),
    calls: fake.calls,
  };
}

describe('findOrCreateClient', () => {
  it('returns the existing client without creating one', async () => {
    const { client, calls } = clientWith([{ status: 200, body: { entities: [{ id: 7 }] } }]);
    const result = await client.findOrCreateClient({ ...buyerFixture, email: 'jan@example.test' });
    expect(result).toEqual({ ok: true, value: { id: 7 } });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('q%5Bemail_eq%5D=jan%40example.test');
  });

  it('creates a private person when nothing matches', async () => {
    const { client, calls } = clientWith([
      { status: 200, body: { entities: [] } },
      { status: 201, body: { id: 8 } },
    ]);
    const result = await client.findOrCreateClient(buyerFixture);
    expect(result).toEqual({ ok: true, value: { id: 8 } });
    expect(calls[0].url).toContain('q%5Bfirst_name_eq%5D=Jan');
    expect(calls[1].method).toBe('POST');
    expect(calls[1].body).toEqual({
      client: {
        business_activity_kind: 'private_person',
        first_name: 'Jan',
        last_name: 'Testowy',
        city: 'Miastowo',
      },
    });
  });

  it('stops on a failed search', async () => {
    const { client, calls } = clientWith([{ status: 401, body: errorFixtures.unauthorized }]);
    const result = await client.findOrCreateClient(buyerFixture);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('reports an unreadable client body', async () => {
    const { client } = clientWith([
      { status: 200, body: { entities: [] } },
      { status: 201, body: { id: 'x' } },
    ]);
    const result = await client.findOrCreateClient(buyerFixture);
    expect(result.ok === false && result.error.kind).toBe('invalid_response');
  });
});

describe('issueDocument', () => {
  const input = { clientId: 7, description: 'Pakiet 4 lekcji', grossPriceCents: 40000 };

  it('sends a transfer invoice with a due date from the payment term', async () => {
    const { client, calls } = clientWith([{ status: 201, body: documentFixture }]);
    const result = await client.issueDocument(input);

    expect(result.ok && result.value).toMatchObject({
      id: 1001,
      uuid: documentFixture.uuid,
      status: 'draft',
    });
    expect(calls[0].url).toBe(`${INFAKT_SANDBOX_URL}/invoices.json`);
    expect(calls[0].headers['X-inFakt-ApiKey']).toBe('test-key-not-real');
    expect(calls[0].body).toEqual({
      invoice: {
        kind: 'vat',
        client_id: 7,
        payment_method: 'transfer',
        invoice_date: '2026-11-22',
        sale_date: '2026-11-22',
        payment_date: '2026-11-29',
        services: [{ name: 'Pakiet 4 lekcji', quantity: 1, tax_symbol: '23', gross_price: 40000 }],
      },
    });
  });

  it('adds the exemption reason for the zw rate and honours the kind', async () => {
    const { client, calls } = clientWith([{ status: 201, body: documentFixture }], exemptConfig);
    await client.issueDocument({ ...input, issuedOn: '2026-12-30' });
    const sent = calls[0].body as { invoice: Record<string, unknown> };
    expect(sent.invoice).toMatchObject({
      kind: 'proforma',
      vat_exemption_reason: 4,
      payment_date: '2027-01-06',
    });
  });

  it('accepts an asynchronous reply that carries only a uuid', async () => {
    const { client } = clientWith([{ status: 201, body: { uuid: 'abc', status: 'draft' } }]);
    const result = await client.issueDocument(input);
    expect(result.ok && result.value).toMatchObject({ id: null, uuid: 'abc' });
  });

  it('turns a 422 on the bank account into a readable error', async () => {
    const { client } = clientWith([{ status: 422, body: errorFixtures.noBankAccount }]);
    const result = await client.issueDocument(input);
    expect(result.ok === false && result.error).toMatchObject({
      kind: 'no_bank_account',
      status: 422,
    });
    expect(result.ok === false && result.error.message).toMatch(
      /No bank account configured in inFakt/
    );
  });

  it('rejects a document without id or uuid', async () => {
    const { client } = clientWith([{ status: 201, body: { status: 'draft' } }]);
    const result = await client.issueDocument(input);
    expect(result.ok === false && result.error.kind).toBe('invalid_response');
  });
});

describe('getDocument, listDocuments', () => {
  it('reads by id and by uuid', async () => {
    const { client, calls } = clientWith([
      { status: 200, body: documentFixture },
      { status: 200, body: documentFixture },
    ]);
    await client.getDocument(1001);
    await client.getDocument(documentFixture.uuid);
    expect(calls[0].url).toBe(`${INFAKT_SANDBOX_URL}/invoices/1001.json`);
    expect(calls[1].url).toBe(`${INFAKT_SANDBOX_URL}/invoices/${documentFixture.uuid}.json`);
  });

  it('maps a 404', async () => {
    const { client } = clientWith([{ status: 404, body: errorFixtures.notFound }]);
    const result = await client.getDocument(1);
    expect(result.ok === false && result.error).toMatchObject({
      kind: 'not_found',
      message: 'Resource not found.',
    });
  });

  it('encodes brackets in list filters', async () => {
    const { client, calls } = clientWith([
      { status: 200, body: { entities: [paidDocumentFixture] } },
    ]);
    const result = await client.listDocuments({ status: 'paid', limit: 50, offset: 0 });
    expect(calls[0].url).toBe(
      `${INFAKT_SANDBOX_URL}/invoices.json?q%5Bstatus_eq%5D=paid&offset=0&limit=50`
    );
    expect(result.ok && result.value.map(isPaid)).toEqual([true]);
  });

  it('lists without filters and rejects a broken entity', async () => {
    const { client, calls } = clientWith([{ status: 200, body: { entities: [{ nope: 1 }] } }]);
    const result = await client.listDocuments();
    expect(calls[0].url).toBe(`${INFAKT_SANDBOX_URL}/invoices.json`);
    expect(result.ok).toBe(false);
  });
});

describe('createPaymentLink, markPaid', () => {
  it('returns the quick payment link', async () => {
    const { client, calls } = clientWith([
      { status: 201, body: { payment_link: 'https://pay.example.test/abc' } },
    ]);
    const result = await client.createPaymentLink(1001);
    expect(result).toEqual({ ok: true, value: { url: 'https://pay.example.test/abc' } });
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: `${INFAKT_SANDBOX_URL}/invoices/1001/quick_payments.json`,
    });
  });

  it('maps the 422 of an account without quick payments', async () => {
    const { client } = clientWith([{ status: 422, body: errorFixtures.invalidResource }]);
    const result = await client.createPaymentLink(1001);
    expect(result.ok === false && result.error).toMatchObject({
      kind: 'validation',
      fieldErrors: { invalid_resource: ['Document cannot be processed.'] },
    });
  });

  it('marks paid on an empty 204', async () => {
    const { client, calls } = clientWith([{ status: 204 }]);
    expect(await client.markPaid(documentFixture.uuid)).toEqual({ ok: true, value: null });
    expect(calls[0].url).toBe(`${INFAKT_SANDBOX_URL}/invoices/${documentFixture.uuid}/paid.json`);
  });

  it('passes a markPaid failure through', async () => {
    const { client } = clientWith([{ status: 404, body: errorFixtures.notFound }]);
    expect((await client.markPaid(5)).ok).toBe(false);
  });
});

describe('error handling', () => {
  it('maps 401', async () => {
    const { client } = clientWith([{ status: 401, body: errorFixtures.unauthorized }]);
    const result = await client.getDocument(1);
    expect(result.ok === false && result.error).toMatchObject({
      kind: 'unauthorized',
      isRetryable: false,
    });
  });

  it('maps a 422 with field errors', async () => {
    const { client } = clientWith([{ status: 422, body: errorFixtures.validation }]);
    const result = await client.getDocument(1);
    expect(result.ok === false && result.error).toMatchObject({
      kind: 'validation',
      message: 'Validation failed',
      fieldErrors: { vat_exemption_reason: ['is missing'] },
    });
  });

  it('never throws on a network failure and marks it retryable', async () => {
    const warn = jest.fn();
    const fake = createFakeFetch([new Error('ECONNRESET')]);
    const client = buildInfaktClient(config, { fetch: fake.fetch, logger: { warn } });
    const result = await client.getDocument(1);
    expect(result.ok === false && result.error).toMatchObject({
      kind: 'network',
      status: null,
      isRetryable: true,
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('test-key-not-real');
  });

  it('survives a non-JSON error and a non-JSON success', async () => {
    const { client } = clientWith([
      { status: 502, body: '<html>Bad gateway</html>' },
      { status: 200, body: '<html>oops</html>' },
    ]);
    const bad = await client.getDocument(1);
    expect(bad.ok === false && bad.error).toMatchObject({
      kind: 'http',
      status: 502,
      isRetryable: true,
    });
    const odd = await client.getDocument(1);
    expect(odd.ok === false && odd.error.kind).toBe('invalid_response');
  });

  it('does not retry-flag a 402 and reads non-object bodies safely', async () => {
    const { client } = clientWith([{ status: 402, body: ['x'] }]);
    const result = await client.getDocument(1);
    expect(result.ok === false && result.error).toMatchObject({
      kind: 'http',
      status: 402,
      isRetryable: false,
    });
  });
});

describe('createInfaktClient', () => {
  it('is skipped without an API key', () => {
    expect(createInfaktClient({ documentKind: 'vat', vatRate: '23' })).toEqual({
      status: 'skipped',
      reason: 'not_configured',
    });
    expect(createInfaktClient({ apiKey: '  ' }).status).toBe('skipped');
    expect(createInfaktClient(undefined).status).toBe('skipped');
  });

  it('reports invalid configuration, including zw without a reason', () => {
    const result = createInfaktClient({ apiKey: 'k', documentKind: 'vat', vatRate: 'zw' });
    expect(result.status === 'invalid' && result.issues.join()).toContain('exemptionReasonId');
  });

  it('builds a client for a valid configuration with defaults', () => {
    const result = createInfaktClient({ apiKey: 'k', documentKind: 'proforma', vatRate: '23' });
    expect(result.status).toBe('ready');
    expect(
      infaktConfigSchema.parse({ apiKey: 'k', documentKind: 'vat', vatRate: '8' })
    ).toMatchObject({
      baseUrl: 'https://api.infakt.pl/api/v3',
      paymentTermDays: 7,
    });
  });
});

describe('isPaid', () => {
  it('trusts status only', () => {
    expect(isPaid({ status: 'paid' })).toBe(true);
    expect(isPaid({ status: 'printed' })).toBe(false);
    // After "mark as paid" inFakt leaves paid_price 0 and left_to_pay unchanged.
    expect(isPaid({ ...documentFixture, status: 'paid', paid_price: 0 })).toBe(true);
    expect(isPaid({ ...documentFixture, paid_price: 40000, left_to_pay: 0 })).toBe(false);
  });
});
