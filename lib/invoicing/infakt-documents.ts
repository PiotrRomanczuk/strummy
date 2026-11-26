import { z } from 'zod';
import { invalidResponseError } from './infakt-errors';
import type { InfaktDocument, InfaktResult } from './infakt-types';

const documentSchema = z
  .object({
    id: z.number().int().nullish(),
    uuid: z.string().nullish(),
    number: z.string().nullish(),
    kind: z.string().nullish(),
    status: z.string(),
    gross_price: z.number().nullish(),
    paid_date: z.string().nullish(),
  })
  .refine((raw) => raw.id != null || raw.uuid != null, 'document has neither id nor uuid');

const listSchema = z.object({ entities: z.array(z.unknown()) });
const clientSchema = z.object({ id: z.number().int() });
const paymentLinkSchema = z.object({ payment_link: z.string().min(1) });

type RawDocument = z.infer<typeof documentSchema>;

function toDocument(raw: RawDocument): InfaktDocument {
  return {
    id: raw.id ?? null,
    uuid: raw.uuid ?? null,
    number: raw.number ?? null,
    kind: raw.kind ?? null,
    status: raw.status,
    grossPriceCents: raw.gross_price ?? null,
    paidDate: raw.paid_date ?? null,
  };
}

function parseWith<T>(schema: z.ZodType<T>, body: unknown, status: number): InfaktResult<T> {
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: invalidResponseError(status) };
}

export function parseDocument(body: unknown, status = 200): InfaktResult<InfaktDocument> {
  const result = parseWith(documentSchema, body, status);
  return result.ok ? { ok: true, value: toDocument(result.value) } : result;
}

export function parseDocumentList(body: unknown, status = 200): InfaktResult<InfaktDocument[]> {
  const list = parseWith(listSchema, body, status);
  if (!list.ok) return list;
  const documents: InfaktDocument[] = [];
  for (const entity of list.value.entities) {
    const parsed = parseDocument(entity, status);
    if (!parsed.ok) return parsed;
    documents.push(parsed.value);
  }
  return { ok: true, value: documents };
}

export function parseClientId(body: unknown, status = 200): InfaktResult<{ id: number }> {
  return parseWith(clientSchema, body, status);
}

/** The first entity of a client search, or null when nothing matched. */
export function parseFirstClientId(body: unknown): InfaktResult<{ id: number } | null> {
  const list = parseWith(listSchema, body, 200);
  if (!list.ok) return list;
  if (list.value.entities.length === 0) return { ok: true, value: null };
  return parseClientId(list.value.entities[0]);
}

export function parsePaymentLink(body: unknown, status = 200): InfaktResult<{ url: string }> {
  const result = parseWith(paymentLinkSchema, body, status);
  return result.ok ? { ok: true, value: { url: result.value.payment_link } } : result;
}

/**
 * Paid is recognised by status only. After "mark as paid" inFakt keeps
 * `paid_price` at 0 and `left_to_pay` unchanged (sandbox, 2026-11-16).
 */
export function isPaid(document: Pick<InfaktDocument, 'status'>): boolean {
  return document.status === 'paid';
}
