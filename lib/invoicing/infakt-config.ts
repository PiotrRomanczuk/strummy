import { z } from 'zod';

export const INFAKT_PRODUCTION_URL = 'https://api.infakt.pl/api/v3';
export const INFAKT_SANDBOX_URL = 'https://api.sandbox-infakt.pl/api/v3';

/** inFakt tax symbols; `zw` is the exemption and needs a reason id. */
const vatRateSchema = z.enum(['23', '8', '5', '0', 'zw', 'np']);

export const infaktConfigSchema = z
  .object({
    apiKey: z.string().min(1),
    baseUrl: z.string().url().default(INFAKT_PRODUCTION_URL),
    documentKind: z.enum(['proforma', 'vat']),
    vatRate: vatRateSchema,
    /** Id from GET /vat_exemptions.json; required when vatRate is `zw`. */
    exemptionReasonId: z.number().int().positive().optional(),
    paymentTermDays: z.number().int().min(0).max(365).default(7),
  })
  .refine((config) => config.vatRate !== 'zw' || config.exemptionReasonId !== undefined, {
    message: 'exemptionReasonId is required when vatRate is "zw"',
    path: ['exemptionReasonId'],
  });

export type InfaktConfig = z.infer<typeof infaktConfigSchema>;

export type ConfigOutcome =
  | { status: 'ready'; config: InfaktConfig }
  /** No API key: dev and CI. Callers must not issue anything. */
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'invalid'; issues: string[] };

function hasApiKey(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const { apiKey } = raw as { apiKey?: unknown };
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

export function resolveInfaktConfig(raw: unknown): ConfigOutcome {
  if (!hasApiKey(raw)) return { status: 'skipped', reason: 'not_configured' };

  const parsed = infaktConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return { status: 'invalid', issues };
  }
  return { status: 'ready', config: parsed.data };
}
