---
created: 2026-10-13
updated: 2026-11-14
domain: Billing & Payments
tables:
  [lesson_packages, package_purchases, lesson_credit_entries, billing_settings, billing_customers]
maturity: unbuilt
---

# Billing & Payments (lesson packages + inFakt)

## Purpose

Let the teacher **get paid for the lessons Strummy already counts** — without a spreadsheet. A
student buys a **prepaid package** (karnet, e.g. 4 or 8 lessons), every lesson the teacher
confirms as held takes one off the balance, and both sides see how many lessons are left or how
many are still to pay.

Money and invoices live in **inFakt**, the owner's accounting service: Strummy asks inFakt to
issue the invoice for a package, the student pays from inFakt's payment link, and Strummy adds
the lessons once inFakt reports the invoice as paid. Strummy holds no card data and runs no
payment gateway.

**Maturity: the ledger and the price list work; selling a package does not exist yet.** A held
lesson already takes one off the balance (database trigger), and the teacher keeps a price list
and the billing start date under Settings → Płatności (`mounted`). Nothing shows the balance or
records a payment yet (`unbuilt`): the product walkthrough still lists payments under "czego NIE
ma", and `ParentBillingCard` renders a "coming soon" slot.

**Decisions this doc is built on** (owner, 2026-11-12):

| Question              | Decision                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Billing model         | Prepaid packages from a shared price list; a student's `lesson_rate` overrides the price                    |
| Expiry                | None — a package never expires                                                                              |
| Empty balance         | The balance may go negative; negative lessons are shown as "do zapłaty"                                     |
| Absence, cancellation | Free. Both are `CANCELLED`; there is no `NO_SHOW` status                                                    |
| Which lessons count   | Lessons come from Google Calendar; a lesson counts only after the teacher confirms it was held (doc 02)     |
| Invoice               | Issued automatically in inFakt for every package                                                            |
| Payment               | inFakt payment link ("Szybka Płatność"); cash or a plain transfer is recorded by the teacher                |
| Stripe                | Deferred until one of: foreign cards, automatic monthly tuition, Strummy charging other teachers (BIL-6, 8) |

## Data model

All money columns are **integer grosze** (`*_cents`), currency fixed to `PLN`.

| Table                   | Key columns                                                                                                                                                                                                                                                                  | Notes                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `lesson_packages`       | `teacher_id, name, lesson_count (1–100), price_cents, is_active`                                                                                                                                                                                                             | The teacher's price list                                                                         |
| `package_purchases`     | `teacher_id, student_id, payer_id, package_id null, description, lesson_count, amount_cents, status (pending · paid · cancelled), payment_method (infakt · transfer · cash · other), due_on, paid_at, invoice_status, infakt_invoice_id unique, invoice_number, payment_url` | One sold package. Name, count and amount are copied at sale time                                 |
| `lesson_credit_entries` | `teacher_id, student_id, delta (≠ 0), reason (purchase · lesson · manual · refund), purchase_id, lesson_id, note`                                                                                                                                                            | The ledger. Unique per `purchase_id` where `reason = purchase`, per `lesson_id` where `= lesson` |
| `billing_settings`      | `teacher_id pk, billing_start_on, payment_term_days (default 7)`                                                                                                                                                                                                             | One row per teacher                                                                              |
| `billing_customers`     | `profile_id pk, infakt_client_id unique`                                                                                                                                                                                                                                     | The payer's client record in inFakt                                                              |

**Derived, not stored**: a student's balance = `sum(lesson_credit_entries.delta)`. Storing it
would let it drift from its own history.

**`invoice_status`**: `pending` (not sent to inFakt yet) · `issued` · `failed` (inFakt refused;
retried) · `skipped` (no inFakt key — dev and CI).

**Buyer data stays in inFakt.** Name, address and NIP are entered once and stored on the inFakt
client; Strummy keeps `infakt_client_id` only. It is a table, not a `profiles` column, because
users update their own profile row — whoever can change that id decides whose name the next
invoice carries.

**RLS** (ADR-0001 — the DB is the boundary): the teacher reads rows where `teacher_id =
current_profile_id()`; the student reads rows where `student_id` (or `payer_id`) is theirs; a
parent reads the child's rows through `is_child_of_parent()`; an admin reads all. A student also
reads the active price list of a teacher they have lessons with. **There is no `insert`,
`update` or `delete` policy for `authenticated` on any of the five tables** — every write goes
through a server action or the inFakt sync with the service-role client, so nobody signed in can
credit themselves.

## Behavior & rules

1. **A held lesson costs one.** When a lesson becomes `COMPLETED` and its `scheduled_at` is on
   or after the teacher's `billing_start_on`, the ledger gets one `lesson` entry of −1. When it
   leaves `COMPLETED` or is soft-deleted, the entry is removed. With no `billing_start_on` set,
   nothing is charged: older `COMPLETED` rows came from the historical calendar import and say
   nothing about what was paid.
2. **A paid package adds N — once.** Marking a purchase `paid` writes one `purchase` entry of
   `+lesson_count`. The unique index makes a second credit for the same purchase impossible,
   whether the sync runs twice or the teacher clicks twice.
3. **Price** = `lesson_rate × lesson_count` when the student has a `lesson_rate`, otherwise the
   package's `price_cents`. The result is copied into the purchase.
4. **The invoice is issued when the package is created**, with a due date of
   `payment_term_days`, and inFakt emails it to the payer. Strummy stores the invoice number and
   the payment link.
5. **inFakt is the only automatic path to `paid`.** `syncPurchasePayments()` asks inFakt for the
   status of every `pending` purchase — on the billing pages (rate-limited) and in the daily
   dispatcher. The teacher's manual "Wpłata" marks the purchase paid _and_ the invoice paid in
   inFakt, so the two never disagree.
6. **An inFakt failure never blocks a sale.** The purchase is saved with `invoice_status =
failed` and retried; without an API key it is `skipped`, so dev and CI never issue a real
   invoice.
7. **VAT rate or exemption basis comes from configuration**, not code (BIL-7).
8. **Demo and dev accounts** are blocked by `guardTestAccountMutation` as everywhere else.

## UI surfaces

Only the settings tab exists; the rest is planned.

| Surface                                     | Role            | What it shows                                                                             |
| ------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `/dashboard/settings` → "Płatności"         | teacher         | Price list (add, edit, switch off), billing start date, payment term                      |
| `/dashboard/users/[id]` → tab "Rozliczenia" | teacher         | Balance, ledger history, "Wystaw karnet", "Wpłata", invoice number and status, "Ponów"    |
| `/dashboard/billing`                        | student, parent | Balance, open packages with **Zapłać** (inFakt link), price list with "Kup", paid history |
| Student / parent home                       | student, parent | "Zostało N lekcji" or "Do zapłaty"; replaces `ParentBillingCard`'s coming-soon body       |

Polish copy from day one through next-intl; amounts in zł, never `$`.

## Gaps & planned work

Ordered. BIL-10 alone makes billing usable by hand; BIL-11 adds invoices and the payment link.

_Shipped 2026-11-13: BIL-9 — the five tables, read-only RLS and their RLS tests._
_Shipped 2026-11-14: the first half of BIL-10 — balance trigger on `lessons` (rule 1) with
`rebuild_lesson_credit_entries()`, price list and billing settings under Settings → Płatności,
`packagePriceCents`, the intake form shows zł and no billing cycle._

### BIL-10 · Selling a package and recording a payment

**Missing**: no way to sell a package or record that it was paid; the balance is computed but
shown nowhere.

**Approach**: balance query in `lib/services/billing/` (sum of the ledger). Server actions with
Zod schemas: `createPurchase` (price from rule 3, due date from `payment_term_days`) and
`markPurchasePaid` (rule 2), both through the service role and pinned to the caller's profile
like `app/actions/billing-settings.ts`. Student page tab "Rozliczenia": balance, ledger history,
"Wystaw karnet", "Wpłata".

**Files**: `lib/services/billing/*` · `app/actions/billing-purchases.ts` ·
`schemas/BillingSchema.ts` · `components/billing/*` · `components/users/StudentDetail*`.

**Accept**: with a start date set, a 4-lesson package marked paid shows balance 4; confirming a
lesson shows 3; un-confirming it shows 4; five held lessons show −1 as "1 lekcja do zapłaty";
marking the same package paid twice still shows 4.

### BIL-11 · Invoices and payment through inFakt

**Missing**: no invoice, no way to pay online.

**Approach**: `lib/invoicing/` — a self-contained REST client for inFakt API v3 (create client,
create invoice, read status and payment link, mark paid). **It imports nothing from Strummy or
Supabase** — it takes a buyer and line items and returns ids — so it can move to a shared
package when lesson-notes needs it; an architecture test guards the boundary. Wiring lives in
`lib/services/billing/`: first purchase collects buyer data → inFakt client →
`billing_customers`; `createPurchase` issues the invoice; `syncPurchasePayments()` implements
rule 5; failures follow rule 6.

**Files**: `lib/invoicing/*` · `lib/services/billing/invoice-sync.ts` ·
`app/api/cron/dispatcher/route.ts` · `.env.example` (`INFAKT_API_KEY`, VAT settings).

**Accept**: against recorded inFakt responses — a purchase gets a number and a payment link; a
422 leaves `invoice_status = failed` and the purchase intact; a "paid" status credits the
lessons exactly once across two sync runs. One real invoice is issued by hand, with the owner's
consent, before the key reaches production.

### BIL-12 · Student and parent side

**Missing**: the student has no view of their balance or what they owe.

**Approach**: `/dashboard/billing` for the student, the home card, a real `ParentBillingCard`.
"Zapłać" is a plain link to `payment_url`. Two notification types on the existing engine (doc
07): `payment_received` (teacher) and `credits_low` (student, balance ≤ 1).

**Files**: `app/dashboard/billing/page.tsx` · `components/billing/StudentBilling*.tsx` ·
`components/dashboard/parent/ParentDashboard.Sidebar.tsx` · `types/notifications.ts` ·
`lib/email/render-notification.ts` · migration for the two enum values.

**Accept**: a student sees the balance within one navigation of home; an open package shows
"Zapłać"; the parent of that student sees the same; another student does not.

### BIL-13 · Core flow F12 "Karnet i saldo"

**Missing**: nothing proves the loop end to end.

**Approach**: `tests/flows/f12-billing.spec.ts` — the teacher sets the price list, issues a
package, records the payment, confirms lessons until the balance goes below zero, and the
student sees "do zapłaty". Update `tests/flows/README.md`, the product walkthrough and the FAQ
line that says there are no payments.

**Accept**: F12 green on the dev stack, with inFakt `skipped`.

### BIL-7 · Polish invoicing compliance

**Missing**: the accountant's answer on two points. The inFakt account is set to mixed VAT
sales, so the rate (or exemption basis) for guitar lessons is not obvious; and an invoice issued
before payment means an unpaid package needs a correction, where a pro-forma would not.

**Approach**: ask before the first real invoice. Both answers are configuration in BIL-11
(VAT rate / exemption reason; invoice kind), not code changes.

**Accept**: the answers are recorded in Open questions (struck through, dated).

### BIL-6 · Recurring tuition — parked

Fixed monthly tuition charged automatically. Needs a card or BLIK mandate, which inFakt's
payment link does not offer — this is the first reason to bring in Stripe. Owner decision.

### BIL-8 · Strummy charging teachers (SaaS) — parked

No pricing model and one teacher. The FAQ promises "nikt nie zostanie zaskoczony rachunkiem".
Separate payer and separate account from everything above.

_Withdrawn 2026-11-12: BIL-1 … BIL-5 described Stripe-hosted invoices billed monthly in arrears.
The owner chose prepaid packages and inFakt instead; the IDs are retired, not reused._

## Test plan

- **Unit**: `packagePriceCents` (rate override, zero rate), price parsing, balance sum.
- **Integration**: the inFakt client on recorded responses (issue, 422, paid);
  `syncPurchasePayments` never credits twice; the architecture test for `lib/invoicing/`.
- **RLS** (`npm run test:rls`, `billing.rls.test.ts`): teacher ↔ teacher and student ↔ student
  isolation; a parent reads the child's rows; `authenticated` cannot insert, update or delete;
  one credit per purchase. `lesson-credit-trigger.rls.test.ts`: the trigger against the real
  database, including the start-date boundary by the Europe/Warsaw calendar day.
- **E2E** (≤ 3, Desktop Chrome): F12 (BIL-13) · the student billing page (BIL-12). Never mocked;
  inFakt is `skipped` on the dev stack and checked by hand with one real invoice.

## Open questions

1. **VAT rate or exemption basis for lessons** — accountant (BIL-7).
2. **Invoice before payment, or pro-forma first?** — accountant (BIL-7).
3. **Does inFakt's payment link offer BLIK** or only bank transfer? Unconfirmed; the account
   needs a verified bank account and the Autopay confirmation before a link is issued at all.
4. **Payer for minors**: when a parent is linked, is the parent always the invoice buyer?
   `payer_id` allows either; the default is not decided.
5. **Which calendar events are lessons?** The Google sync accepts only events created by
   Calendly; a lesson typed in by hand never reaches the balance (doc 02).
6. ~~Who pays whom~~ — students pay the teacher; Strummy charging teachers is BIL-8.
   _(2026-11-12)_
7. ~~No-shows~~ — free, recorded as `CANCELLED`. _(2026-11-12)_
8. ~~`lesson_rate` unit~~ — per lesson. _(2026-11-12)_

## References

- inFakt API v3 (`https://api.infakt.pl/api/v3`, header `X-inFakt-ApiKey`): invoices expose
  `extensions.payments.link`, `status`, `paid_date`, `left_to_pay`.
- In repo: ADR-0001 (RLS boundary) · [02-lessons-calendar.md](02-lessons-calendar.md) (attendance
  confirmation) · [07-notifications-email.md](07-notifications-email.md) (producer registry,
  daily dispatcher) · [01-identity-access.md](01-identity-access.md) (`parent_id`,
  `guardTestAccountMutation`) · `supabase/migrations/20261113100000_billing_tables.sql` ·
  `lib/testing/rls/__tests__/billing.rls.test.ts` ·
  `components/dashboard/parent/ParentDashboard.Sidebar.tsx` (`ParentBillingCard`).
