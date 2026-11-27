import type { InfaktConfig } from './infakt-config';
import type { InfaktBuyer, IssueDocumentInput } from './infakt-types';

const WARSAW_TIME_ZONE = 'Europe/Warsaw';

/** YYYY-MM-DD in Warsaw, so an evening sale is not dated "tomorrow" or "yesterday". */
export function warsawDate(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WARSAW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildClientPayload(buyer: InfaktBuyer) {
  return {
    client: {
      business_activity_kind: 'private_person',
      first_name: buyer.firstName,
      last_name: buyer.lastName,
      city: buyer.city,
      ...(buyer.email ? { email: buyer.email } : {}),
    },
  };
}

/** Ransack-style filters used to look a private person up before creating one. */
export function buildClientSearch(buyer: InfaktBuyer): Record<string, string> {
  if (buyer.email) return { 'q[email_eq]': buyer.email };
  return {
    'q[first_name_eq]': buyer.firstName,
    'q[last_name_eq]': buyer.lastName,
    'q[city_eq]': buyer.city,
  };
}

export function buildInvoicePayload(
  config: InfaktConfig,
  input: IssueDocumentInput,
  today: string
) {
  const issuedOn = input.issuedOn ?? today;
  return {
    invoice: {
      kind: config.documentKind,
      client_id: input.clientId,
      payment_method: 'transfer',
      invoice_date: issuedOn,
      sale_date: issuedOn,
      payment_date: addDays(issuedOn, config.paymentTermDays),
      ...(config.vatRate === 'zw' ? { vat_exemption_reason: config.exemptionReasonId } : {}),
      services: [
        {
          name: input.description,
          quantity: 1,
          tax_symbol: config.vatRate,
          gross_price: input.grossPriceCents,
        },
      ],
    },
  };
}
