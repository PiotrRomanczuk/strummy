/**
 * Mailpit API helper for E2E tests.
 *
 * Mailpit is the local email capture server bundled with Supabase CLI
 * (API port + 3: the dev stack on 55321 serves it on 55324). It captures all outbound emails
 * so tests can assert delivery without hitting real SMTP.
 *
 * Usage:
 *   await deleteAllMailpitMessages();        // clean slate
 *   // ... trigger action that sends email
 *   const msg = await waitForEmail('student@example.com');
 *   expect(msg.Subject).toBe("You've been invited to Strummy");
 *   const link = extractLink(msg.HTML ?? msg.Text ?? '');
 */

/** Mailpit REST message summary (subset of fields we care about) */
export interface MailpitMessage {
  ID: string;
  Subject: string;
  From: { Name: string; Address: string };
  To: Array<{ Name: string; Address: string }>;
  /** ISO timestamp — the list endpoint reports `Created`, the detail endpoint `Date`. */
  Created?: string;
  Date?: string;
  /** Available after fetchMessageBody() */
  HTML?: string;
  Text?: string;
}

/**
 * The Supabase CLI serves Mailpit on the stack's API port + 3 (54321 → 54324,
 * 55321 → 55324). Derive it from the configured dev stack rather than fixing
 * the port: 54324 is the PRODUCTION stack's catcher, and the dev stack this
 * suite runs against lives on 55321. `MAILPIT_URL` overrides the derivation.
 */
export function mailpitBaseUrl(): string {
  if (process.env.MAILPIT_URL) return process.env.MAILPIT_URL.replace(/\/$/, '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:55321';
  try {
    const u = new URL(supabaseUrl);
    const apiPort = Number(u.port || 80);
    return `${u.protocol}//${u.hostname}:${apiPort + 3}`;
  } catch {
    return 'http://127.0.0.1:55324';
  }
}

export async function deleteAllMailpitMessages(): Promise<void> {
  await fetch(`${mailpitBaseUrl()}/api/v1/messages`, { method: 'DELETE' });
}

/**
 * Poll until an email to `toAddress` appears in Mailpit, then return it.
 * Throws if no matching email arrives within `timeoutMs`.
 *
 * `since` (epoch ms) ignores anything received before that instant, so a spec
 * can wait for the mail *it* triggered without wiping an inbox that other
 * specs on the same dev stack are reading at the same time.
 */
export async function waitForEmail(
  toAddress: string,
  timeoutMs = 15_000,
  since = 0
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  const wanted = toAddress.toLowerCase();
  while (Date.now() < deadline) {
    const res = await fetch(`${mailpitBaseUrl()}/api/v1/messages?limit=100`);
    if (res.ok) {
      const body = await res.json();
      const messages: MailpitMessage[] = body.messages ?? [];
      const match = messages.find(
        (m) =>
          m.To.some((t) => t.Address.toLowerCase() === wanted) &&
          new Date(m.Created ?? m.Date ?? 0).getTime() >= since
      );
      if (match) return match;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `No email to ${toAddress} arrived in Mailpit within ${timeoutMs}ms. ` +
      `Check Mailpit at ${mailpitBaseUrl()}`
  );
}

/**
 * Fetch the full HTML/text body of a message by ID.
 * `GET /api/v1/message/{ID}` returns JSON with `HTML` and `Text` fields.
 */
export async function fetchMessageBody(messageId: string): Promise<{ html: string; text: string }> {
  const res = await fetch(`${mailpitBaseUrl()}/api/v1/message/${messageId}`);
  if (!res.ok) return { html: '', text: '' };
  const body = (await res.json()) as { HTML?: string; Text?: string };
  return { html: body.HTML ?? '', text: body.Text ?? '' };
}

/**
 * The GoTrue `/auth/v1/verify?token=…` link from an auth email (invite,
 * recovery, confirmation), addressed at the configured dev stack.
 *
 * GoTrue writes its own `API_EXTERNAL_URL` into the link, which on the
 * EliteDesk stack is `127.0.0.1:55321` — reachable from the stack's host, not
 * from the runner. Swap in the origin of NEXT_PUBLIC_SUPABASE_LOCAL_URL so the
 * link can be followed from wherever the tests run.
 */
export function extractVerifyLink(body: string): string | null {
  const match = body.match(/https?:\/\/[^\s"'<>()]+\/auth\/v1\/verify\?[^\s"'<>()]+/);
  if (!match) return null;
  const link = new URL(match[0].replace(/&amp;/g, '&'));
  const stack = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
  if (stack) {
    const target = new URL(stack);
    link.protocol = target.protocol;
    link.host = target.host;
  }
  return link.toString();
}

/** Extract the first https?:// link from an email body string. */
export function extractFirstLink(body: string): string | null {
  const match = body.match(/https?:\/\/[^\s"'<>]+/);
  // HTML bodies entity-encode the query separators.
  return match ? match[0].replace(/&amp;/g, '&') : null;
}

/**
 * Why a step that proves "the mail was delivered" must refuse to run without
 * SMTP_HOST: the app falls back to the real Gmail transport, so the test would
 * send a genuine e-mail (and bounce it into the owner's inbox) instead of
 * proving anything. Call at the top of every mail-delivery step:
 *   test.skip(!isMailpitSmtpConfigured(), MAILPIT_SMTP_REQUIRED);
 * Point SMTP_HOST/SMTP_PORT at the dev stack's Mailpit (tests/flows/README.md,
 * Open question 2) and set STUDENT_EMAILS_ENABLED=true to run them.
 */
export function isMailpitSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST) && process.env.STUDENT_EMAILS_ENABLED === 'true';
}

export const MAILPIT_SMTP_REQUIRED =
  'mail-delivery step: SMTP_HOST must point at the dev Mailpit and STUDENT_EMAILS_ENABLED=true ' +
  '(never send real mail from a test) — tests/flows/README.md, Open question 2';
