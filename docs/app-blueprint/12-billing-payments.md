---
created: 2026-10-13
updated: 2026-10-13
domain: Billing & Payments
tables: [] # planned: invoices, invoice_lines, payments, stripe_events (+ profiles.stripe_customer_id)
maturity: unbuilt
---

# Billing & Payments (Stripe)

## Purpose

Let the teacher **get paid for the lessons Strummy already counts** — without leaving the app
and without a spreadsheet. The teacher issues a monthly bill per student from the completed
lessons, the student (or parent) pays it with BLIK, card or Przelewy24 on a Stripe-hosted page,
and both sides see the status in Strummy. Stripe is the system of record for money; Strummy
mirrors it so the dashboards can show "do zapłaty" next to "następna lekcja".

**Maturity: unbuilt — nothing exists today.** The product walkthrough
(`docs/product-walkthrough/`, chapter 1) lists payments under "czego NIE ma", the FAQ says the
app is free in beta, and `ParentBillingCard` renders a "coming soon" slot. The only existing hook
is `profiles.lesson_rate` (numeric ≥ 0, written by the student-intake form, read by the
edit page, used by nothing).

**Business model decision this doc assumes** (owner to confirm — see Open questions): Strummy
charges **students on behalf of the teacher**, on the **owner's own Stripe account**. It does
_not_ (yet) charge teachers for using Strummy. Single-teacher product ⇒ no Stripe Connect; if a
second teacher ever bills through the app, Connect Express accounts become BIL-9 and the data
model below already keys everything by `teacher_id` for that day.

## Data model

All money columns are **integer grosze** (`amount_cents`), currency fixed to `PLN` for v1.
Stripe IDs are the foreign keys to the truth; local rows are a mirror written by webhooks and
server actions only (`service_role`), never by the client.

| Table           | Key columns                                                                                                                                                                                                                                                                      | Notes                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `profiles` (+)  | `stripe_customer_id text unique null`                                                                                                                                                                                                                                            | One Stripe Customer per paying profile (student, or parent when `is_parent` pays)               |
| `invoices`      | `id, teacher_id, student_id, payer_id` (profile that pays), `stripe_invoice_id unique, number text, status enum(draft, open, paid, void, uncollectible), amount_cents, currency, period_start, period_end, due_at, paid_at, hosted_invoice_url, pdf_url, created_at, updated_at` | Mirror of a Stripe Invoice. `number` is Stripe's, with the account prefix (see BIL-7)           |
| `invoice_lines` | `id, invoice_id, lesson_id null, description, quantity, unit_amount_cents`                                                                                                                                                                                                       | One line per billed lesson; `lesson_id` gives "this lesson is billed/paid" on the lesson detail |
| `payments`      | `id, invoice_id null, payer_id, stripe_payment_intent_id unique, method enum(blik, card, p24, other), amount_cents, status enum(processing, succeeded, failed, refunded), paid_at`                                                                                               | Written from `payment_intent.*` / `invoice.paid` webhooks                                       |
| `stripe_events` | `id text pk` (Stripe event id), `type, received_at, processed_at, error`                                                                                                                                                                                                         | Idempotency ledger for the webhook; a replayed event is a no-op                                 |

**Derived, not stored**: "unbilled lessons" = `lessons` with `status = COMPLETED`,
`deleted_at is null`, and no `invoice_lines.lesson_id` pointing at them. Price = the student's
`profiles.lesson_rate` at billing time, copied into the line (rates change; invoices do not).

**RLS** (ADR-0001 — the DB is the boundary): teacher reads rows where `teacher_id =
current_profile_id()`; student/parent reads rows where `payer_id` or `student_id` is theirs
(parent: via the existing parent↔child link); admin reads all. **No `insert/update` policy for
`authenticated` on any of the four tables** — every write goes through a server action or the
webhook with the service-role client, exactly like `audit_log`.

## Behavior & rules

1. **One billing run per student per period.** `issueInvoice(studentId, period)` collects
   unbilled COMPLETED lessons in the period, refuses when there are none, builds a Stripe Invoice
   (customer ← `stripe_customer_id`, created on first use), one line per lesson
   ("Lekcja gitary 13.10.2026, 45 min"), `collection_method: send_invoice`,
   `days_until_due: 7`, `payment_settings.payment_method_types: ['blik','card','p24']`,
   finalizes it and lets Stripe email the hosted invoice. The local mirror row is written in the
   same action; the webhook later only flips status.
2. **Webhook is the only path to `paid`.** `invoice.paid`, `invoice.payment_failed`,
   `invoice.voided`, `invoice.marked_uncollectible`, `payment_intent.succeeded/failed` →
   `app/api/webhooks/stripe/route.ts`: verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`,
   insert into `stripe_events` (conflict ⇒ return 200, do nothing), apply, mark `processed_at`.
   A UI "mark as paid (cash)" button is a **separate** local action that creates a `payments`
   row with `method = other` and a `void`ed Stripe invoice — never a fake `paid`.
3. **Cancelled lessons are never billed** (`CANCELLED` excluded). There is no `NO_SHOW` status;
   until one exists, a no-show the teacher wants to charge is a COMPLETED lesson with a note
   (Open question 4).
4. **Demo and dev accounts never reach live Stripe.** `is_development` profiles are blocked by
   `guardTestAccountMutation` as today; dev stack and CI use **test-mode** keys only; the
   webhook route refuses live-mode events when `STRIPE_SECRET_KEY` starts with `sk_test_`.
5. **Currency and tax**: PLN only; amounts are what the teacher types (gross). No VAT line in
   v1 — see BIL-7 for what "faktura" legally requires before the first real student is billed.
6. **Notifications** ride the existing engine (doc 07): `invoice_sent` (student + parent),
   `payment_received` (teacher), `invoice_overdue` (student, from the daily dispatcher, once at
   due+1 and once at due+7). Stripe's own reminder emails are switched **off** so the student
   gets one voice.

## UI surfaces

| Surface                                     | Role            | What it shows                                                                                                            |
| ------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/dashboard/billing`                        | teacher         | Month picker · per-student rows: lessons in period, unbilled count, last invoice status chip · "Wystaw rachunek" per row |
| `/dashboard/users/[id]` → tab "Rozliczenia" | teacher         | Invoice history for that student, open amount, link to Stripe hosted page, "Oznacz jako opłacone gotówką"                |
| `/dashboard/lessons/[id]`                   | teacher         | One line: "Rozliczona w rachunku nr …" / "Nierozliczona"                                                                 |
| `/dashboard/billing`                        | student, parent | Open invoices first (amount, due date, **Zapłać** → `hosted_invoice_url`), then paid history with PDF links              |
| Student / parent home                       | student, parent | "Do zapłaty" card only when an `open` invoice exists; replaces `ParentBillingCard`'s coming-soon body                    |
| `/dashboard/settings` → "Płatności"         | teacher         | Stripe connection status (account id, mode), default due days, reminder toggles; **no secrets displayed**                |

Polish copy from day one (`messages/pl.json` via next-intl); no English fallback strings in
this domain.

## Gaps & planned work

Ordered. BIL-1 → BIL-4 is the shippable v1; BIL-5 … BIL-8 wait for usage.

### BIL-1 · Stripe foundation (account, env, client, webhook, mirror tables)

**Missing**: no Stripe dependency, keys, client, webhook or tables.

**Approach**: Polish Stripe account in **test mode**; enable BLIK, cards, Przelewy24 in
Dashboard → Payment methods. Add `stripe` (Node SDK) and `lib/payments/stripe.ts` (singleton,
`apiVersion` pinned, reads `STRIPE_SECRET_KEY`). Migration
`YYYYMMDDHHMMSS_billing_tables.sql`: the four tables + `profiles.stripe_customer_id`, enums,
`set_updated_at` triggers, read-only RLS as above, `grant select` only. Webhook route with
signature verification + `stripe_events` idempotency; local dev via `stripe listen
--forward-to localhost:3000/api/webhooks/stripe`. Env docs in `.env.example`
(`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — the last
only if Elements are ever embedded; v1 uses hosted pages and does not need it).

**Files**: `lib/payments/stripe.ts` · `lib/payments/webhook-handlers.ts` ·
`app/api/webhooks/stripe/route.ts` · `supabase/migrations/…_billing_tables.sql` ·
`database.types.ts` (regenerate) · `.env.example` · `vercel.json` (no change: webhooks are
plain routes).

**Accept**: `stripe trigger invoice.paid` against the dev server writes one `stripe_events` row
and a second identical delivery writes nothing; RLS integration test proves student B cannot
select student A's `invoices`; `npm run db:types:check` green.

### BIL-2 · Billing run: unbilled lessons → Stripe invoice

**Missing**: no way to turn completed lessons into a bill.

**Approach**: `lib/services/billing/unbilled-lessons.ts` (query + pure `priceLessons(lessons,
rate)` in grosze, rounding half-up), `app/actions/billing.ts` → `issueInvoice(studentId,
periodStart, periodEnd)` with a Zod schema in `schemas/BillingSchema.ts`; creates/reuses the
Stripe Customer (name, email, `metadata.profile_id`), the Invoice + InvoiceItems, finalizes,
mirrors locally, enqueues `invoice_sent`. `voidInvoice`, `markPaidOffline` as sibling actions.

**Files**: as above + `components/billing/BillingRun.tsx` (`.Row.tsx`, `.Summary.tsx`) ·
`app/dashboard/billing/page.tsx` (teacher branch) · nav entry under "Nauczanie" in
`components/navigation/menu.constants.ts`.

**Accept**: for a student with 4 COMPLETED lessons in October at `lesson_rate` 120 the run
produces one Stripe invoice of 480,00 zł with 4 lines, the hosted page offers BLIK/karta/P24,
a second run for the same month is refused with "brak nierozliczonych lekcji", and the lesson
detail shows the invoice number.

### BIL-3 · Student and parent side: see, pay, get the PDF

**Missing**: student has no view of what they owe.

**Approach**: student branch of `/dashboard/billing` + home card; `ParentBillingCard` reads the
same query via the parent link. "Zapłać" is a plain link to `hosted_invoice_url` (Stripe page,
BLIK code entry happens there — no PCI surface in Strummy). After payment Stripe redirects back
to `/dashboard/billing?paid=<id>`; the page shows "oczekujemy potwierdzenia" until the webhook
flips the row (poll with TanStack Query, 5 s, max 1 min).

**Files**: `components/billing/StudentInvoices.tsx` · `components/dashboard/student/…` card ·
`components/dashboard/parent/ParentDashboard.Sidebar.tsx` (replace coming-soon body) ·
notification types in doc 07's registry.

**Accept**: student sees the open invoice within one navigation of the home screen, pays it in
Stripe test mode with the BLIK test flow, and within a minute the card disappears and the
history shows "Opłacono · BLIK · 13.10.2026" with a working PDF link; parent of that student
sees the same row; another student does not.

### BIL-4 · Overdue + reminders + core flow F12

**Missing**: nothing nags; nothing proves the loop end to end.

**Approach**: `invoice_overdue` producer in the daily dispatcher (doc 07, next to lesson
reminders); teacher dashboard "wymaga uwagi" card gets an "zaległe płatności: N" line. Add
**F12 "Rozliczenie miesiąca"** to `tests/flows/` (teacher issues → student pays in test mode →
webhook via `stripe trigger` with the real invoice id → both dashboards update). Settings
"Płatności" section.

**Accept**: F12 green on the dev stack; an invoice 8 days past due produces exactly two overdue
notifications over its life, never a third.

### BIL-5 · Lesson packages (karnet 4 / 8 lekcji) — v1.1

**Missing**: prepaid packs, the most common Polish private-lesson arrangement.

**Approach**: Stripe Checkout Session (`mode: payment`, BLIK/card/P24) for a Price per pack;
`lesson_credits` table (purchase → +N, each COMPLETED lesson → −1 via trigger); billing run
skips lessons covered by credits. Gated on BIL-2 having billed a real month first.

**Accept**: buying a 4-pack and completing 5 lessons leaves 1 lesson unbilled for the run.

### BIL-6 · Recurring tuition (Stripe Billing subscription per student) — v1.1

**Missing**: fixed monthly tuition charged automatically.

**Approach**: Stripe Subscription per student with a monthly Price; BLIK recurring needs
**account-level enablement from Stripe support**, uses a flexible mandate (model O), max
2000 PLN per charge, PLN only (Stripe changelog 2026-04-22). Cards work without enablement.
Webhooks already handled by BIL-1. Gated on an explicit owner decision — it changes the
teacher's cash-flow model from per-lesson to per-month.

**Accept**: a student on tuition is charged on the 1st with no action from either side and the
teacher sees it as a paid invoice in the same list.

### BIL-7 · Polish invoicing compliance (faktura / rachunek, numbering, KSeF)

**Missing**: a Stripe invoice PDF is a receipt-grade document, not automatically a Polish
_faktura_. What is legally required depends on the owner's status (sole trader, VAT-exempt
under art. 113 or not).

**Approach**: decide with the accountant **before BIL-2 bills a real student**. Minimum for a
VAT-exempt sole trader selling to consumers: seller name/address/NIP, sequential numbering,
buyer name, date, description, amount, exemption basis. Stripe covers numbering (custom prefix
per account, gapless within prefix), seller details (account settings) and custom fields
(`custom_fields: [{name:'NIP', value}]` for B2B buyers, `tax_ids` type `pl_nip`); the
exemption footer goes in `footer`. **KSeF** (mandatory e-invoicing, 2026) applies to B2B;
consumer sales are out of scope, so the only KSeF case is a company paying for an employee's
lessons — handle by issuing that one outside Strummy until it matters. Alternative if the
accountant rejects Stripe PDFs: keep Stripe for payment, mirror invoices into Fakturownia/ifirma
via their API (`invoices.external_number`), and link that PDF instead.

**Accept**: the accountant has approved a sample PDF from test mode, and the approval is noted
in this doc's Open questions (struck through) with the date.

### BIL-8 · Strummy charging teachers (SaaS subscription) — parked

**Missing**: a pricing model. The FAQ promises "nikt nie zostanie zaskoczony rachunkiem".

**Approach**: do not build until the model is decided and there is a second teacher. When it
comes: Stripe Billing on the **platform** account, `teacher_subscriptions` table, feature gate in
`proxy.ts`, trial handling. Separate from BIL-1…7 by design (different payer, different account).

## Test plan

- **Unit**: `priceLessons` (rounding, zero rate, mixed durations if rate is per lesson),
  period boundaries (Europe/Warsaw, DST), overdue reminder schedule (exactly two).
- **Integration**: webhook handler with recorded Stripe fixtures (`invoice.paid`, duplicate
  delivery, bad signature → 400, live-mode event on test keys → 400); server actions against the
  repo's Supabase mocks.
- **RLS** (`npm run test:rls`): student ↔ student isolation on all four tables; parent sees
  child's invoices; `authenticated` has no insert/update on any of them.
- **E2E** (≤ 3, Desktop Chrome): teacher issues invoice (BIL-2 accept) · student pays in test
  mode (BIL-3 accept) · F12 core flow (BIL-4). Stripe test mode, `stripe trigger` for webhooks
  on the self-hosted runner; never mocked.

## Open questions

1. **Who pays whom — confirm**: students pay the teacher through the owner's Stripe account
   (assumed), vs Strummy charging teachers (BIL-8), vs both.
2. **Owner's tax status** (VAT-exempt? kasa fiskalna obligation for B2C services paid by
   transfer/BLIK — usually exempt when every payment is traceable to a buyer, confirm) — decides
   the shape of BIL-7.
3. **`profiles.lesson_rate` unit**: per lesson or per 60 min? `lessons.duration_minutes`
   exists; today the field means nothing. Decide and label it in the intake form.
4. **No-shows**: charge or not; if yes, `lesson_status` needs `NO_SHOW` (migration + chips in
   doc 02) rather than abusing `COMPLETED`.
5. **Payer for minors**: `is_parent` exists; is the parent always the Stripe Customer when
   linked, or does the student profile own the customer and the parent merely sees it?
6. **Mirror vs live**: this doc mirrors Stripe into Postgres so dashboards stay one query; the
   alternative (read Stripe API per page) is simpler to build and slower. Mirror is assumed.
7. **Refunds and partial payments**: Stripe supports both; v1 UI shows them read-only (status
   from webhook) and the teacher issues refunds in the Stripe Dashboard. Acceptable for v1?

## References

- Stripe: BLIK (`docs.stripe.com/payments/blik`), Invoicing (`docs.stripe.com/invoicing`),
  BLIK recurring in Billing (changelog 2026-04-22), Webhooks + idempotency, `pl_nip` tax id.
- In repo: ADR-0001 (RLS boundary) · [07-notifications-email.md](07-notifications-email.md)
  (producer registry, daily dispatcher) · [01-identity-access.md](01-identity-access.md)
  (`is_parent`, `is_development`, `guardTestAccountMutation`) ·
  `components/dashboard/parent/ParentDashboard.Sidebar.tsx` (`ParentBillingCard`) ·
  `schemas/StudentIntakeSchema.ts` (`lesson_rate`) · `docs/product-walkthrough/content/01-o-co-chodzi.ts`
  (the public "nie ma płatności" line to update when BIL-3 ships).
