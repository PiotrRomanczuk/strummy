/**
 * Public types of the inFakt client. Nothing here knows about Strummy:
 * a buyer and a service line go in, ids and links come out.
 */

export type InfaktErrorKind =
  | 'unauthorized' // 401: the API key was refused
  | 'not_found' // 404
  | 'validation' // 422: inFakt refused the payload
  | 'no_bank_account' // 422 on bank_account / bank_name
  | 'network' // fetch itself failed
  | 'invalid_response' // success status, body we cannot read
  | 'http'; // any other non-2xx (402 plan, 429, 5xx, ...)

export interface InfaktError {
  kind: InfaktErrorKind;
  /** HTTP status, or null when no response arrived. */
  status: number | null;
  /** Readable, safe to show to the teacher. Never contains the API key. */
  message: string;
  /** Field -> messages, from a 422 body. Empty otherwise. */
  fieldErrors: Record<string, string[]>;
  /** True when trying again later may succeed (network, 429, 5xx). */
  isRetryable: boolean;
}

export type InfaktResult<T> = { ok: true; value: T } | { ok: false; error: InfaktError };

/** Optional sink for diagnostics. Receives no secrets and no response bodies. */
export interface InvoicingLogger {
  warn(message: string, context?: Record<string, unknown>): void;
}

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{ status: number; text(): Promise<string> }>;

/** A private person (the only buyer kind needed for lessons). */
export interface InfaktBuyer {
  firstName: string;
  lastName: string;
  city: string;
  email?: string;
}

export interface InfaktClientRecord {
  id: number;
}

export interface IssueDocumentInput {
  clientId: number;
  /** Service line text, e.g. "Pakiet 4 lekcji gitary". */
  description: string;
  /** Gross price of the whole line in grosze. */
  grossPriceCents: number;
  /** Issue / sale date, YYYY-MM-DD. Defaults to today in Europe/Warsaw. */
  issuedOn?: string;
}

/** A document as inFakt returns it. `id` is null while only `uuid` is known. */
export interface InfaktDocument {
  id: number | null;
  uuid: string | null;
  number: string | null;
  kind: string | null;
  status: string;
  grossPriceCents: number | null;
  paidDate: string | null;
}

export interface PaymentLink {
  url: string;
}

export interface DocumentFilter {
  status?: string;
  offset?: number;
  limit?: number;
}

/** inFakt accepts either the numeric id or the uuid in document paths. */
export type DocumentRef = number | string;

export interface InfaktClient {
  findOrCreateClient(buyer: InfaktBuyer): Promise<InfaktResult<InfaktClientRecord>>;
  issueDocument(input: IssueDocumentInput): Promise<InfaktResult<InfaktDocument>>;
  getDocument(ref: DocumentRef): Promise<InfaktResult<InfaktDocument>>;
  listDocuments(filter?: DocumentFilter): Promise<InfaktResult<InfaktDocument[]>>;
  createPaymentLink(ref: DocumentRef): Promise<InfaktResult<PaymentLink>>;
  markPaid(ref: DocumentRef): Promise<InfaktResult<null>>;
}
