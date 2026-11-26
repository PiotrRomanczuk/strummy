import { type InfaktConfig, resolveInfaktConfig } from './infakt-config';
import {
  parseClientId,
  parseDocument,
  parseDocumentList,
  parseFirstClientId,
  parsePaymentLink,
} from './infakt-documents';
import { createInfaktHttp } from './infakt-http';
import {
  buildClientPayload,
  buildClientSearch,
  buildInvoicePayload,
  warsawDate,
} from './infakt-payloads';
import type {
  DocumentRef,
  FetchLike,
  InfaktClient,
  InfaktResult,
  InvoicingLogger,
} from './infakt-types';

export interface InfaktDeps {
  /** Defaults to the global `fetch`; tests inject a fake. */
  fetch?: FetchLike;
  logger?: InvoicingLogger;
  now?: () => Date;
}

export type InfaktFactoryResult =
  | { status: 'ready'; client: InfaktClient }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'invalid'; issues: string[] };

type Parser<T> = (body: unknown) => InfaktResult<T>;

function thenParse<T>(result: InfaktResult<unknown>, parse: Parser<T>): InfaktResult<T> {
  return result.ok ? parse(result.value) : result;
}

function documentPath(ref: DocumentRef, suffix = ''): string {
  return `/invoices/${encodeURIComponent(String(ref))}${suffix}.json`;
}

export function buildInfaktClient(config: InfaktConfig, deps: InfaktDeps = {}): InfaktClient {
  const http = createInfaktHttp({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    fetch: deps.fetch ?? (globalThis.fetch as unknown as FetchLike),
    logger: deps.logger,
  });
  const now = deps.now ?? (() => new Date());

  return {
    async findOrCreateClient(buyer) {
      const found = thenParse(
        await http.request('GET', '/clients.json', { query: buildClientSearch(buyer) }),
        parseFirstClientId
      );
      if (!found.ok || found.value) return found as InfaktResult<{ id: number }>;
      const created = await http.request('POST', '/clients.json', {
        body: buildClientPayload(buyer),
      });
      return thenParse(created, parseClientId);
    },

    async issueDocument(input) {
      const body = buildInvoicePayload(config, input, warsawDate(now()));
      return thenParse(await http.request('POST', '/invoices.json', { body }), parseDocument);
    },

    async getDocument(ref) {
      return thenParse(await http.request('GET', documentPath(ref)), parseDocument);
    },

    async listDocuments(filter = {}) {
      const query: Record<string, string | number> = {};
      if (filter.status) query['q[status_eq]'] = filter.status;
      if (filter.offset !== undefined) query.offset = filter.offset;
      if (filter.limit !== undefined) query.limit = filter.limit;
      return thenParse(await http.request('GET', '/invoices.json', { query }), parseDocumentList);
    },

    async createPaymentLink(ref) {
      const result = await http.request('POST', documentPath(ref, '/quick_payments'));
      return thenParse(result, parsePaymentLink);
    },

    async markPaid(ref) {
      const result = await http.request('POST', documentPath(ref, '/paid'));
      return result.ok ? { ok: true, value: null } : result;
    },
  };
}

/**
 * The entry point. Without an API key the result is `skipped`, so dev and CI
 * can never issue a real invoice; callers branch on `status`.
 */
export function createInfaktClient(rawConfig: unknown, deps: InfaktDeps = {}): InfaktFactoryResult {
  const outcome = resolveInfaktConfig(rawConfig);
  if (outcome.status !== 'ready') return outcome;
  return { status: 'ready', client: buildInfaktClient(outcome.config, deps) };
}
