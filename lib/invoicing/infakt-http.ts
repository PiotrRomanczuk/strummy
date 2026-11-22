import { invalidResponseError, mapErrorResponse, networkError } from './infakt-errors';
import type { FetchLike, InfaktResult, InvoicingLogger } from './infakt-types';

export interface HttpDeps {
  baseUrl: string;
  apiKey: string;
  fetch: FetchLike;
  logger?: InvoicingLogger;
}

export interface RequestOptions {
  query?: Record<string, string | number>;
  body?: unknown;
}

export interface InfaktHttp {
  /** Resolves to the parsed JSON body, or null for an empty (204) body. */
  request(method: string, path: string, options?: RequestOptions): Promise<InfaktResult<unknown>>;
}

/** URLSearchParams encodes brackets, so `q[status_eq]` becomes `q%5Bstatus_eq%5D`. */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number>
): string {
  const root = baseUrl.replace(/\/+$/, '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) params.append(key, String(value));
  const queryString = params.toString();
  return `${root}${path}${queryString ? `?${queryString}` : ''}`;
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  if (text.trim() === '') return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export function createInfaktHttp(deps: HttpDeps): InfaktHttp {
  const headers = {
    'X-inFakt-ApiKey': deps.apiKey,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  async function request(method: string, path: string, options: RequestOptions = {}) {
    const url = buildUrl(deps.baseUrl, path, options.query);
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);

    let response: Awaited<ReturnType<FetchLike>>;
    let text: string;
    try {
      response = await deps.fetch(url, { method, headers, body });
      text = await response.text();
    } catch {
      deps.logger?.warn('inFakt request failed before a response arrived', { method, path });
      return { ok: false, error: networkError() } as const;
    }

    const parsed = parseJson(text);
    const isSuccess = response.status >= 200 && response.status < 300;

    if (!isSuccess) {
      const error = mapErrorResponse(response.status, parsed.ok ? parsed.value : null);
      deps.logger?.warn('inFakt refused a request', {
        method,
        path,
        status: response.status,
        kind: error.kind,
      });
      return { ok: false, error } as const;
    }
    if (!parsed.ok) {
      deps.logger?.warn('inFakt returned a non-JSON body', {
        method,
        path,
        status: response.status,
      });
      return { ok: false, error: invalidResponseError(response.status) } as const;
    }
    return { ok: true, value: parsed.value } as const;
  }

  return { request };
}
