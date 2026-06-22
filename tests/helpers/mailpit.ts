/**
 * Mailpit API helper for E2E tests.
 *
 * Mailpit is the local email capture server bundled with Supabase CLI
 * (at http://<supabase-host>:54324). It captures all outbound emails
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
  /** ISO timestamp */
  Date: string;
  /** Available after fetchMessageBody() */
  HTML?: string;
  Text?: string;
}

function mailpitBaseUrl(): string {
  // Derive Mailpit URL from the Supabase local URL (same host, port 54324).
  // Supports both direct LAN (192.168.1.75:54321) and SSH-tunnel (127.0.0.1:54321).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321';
  try {
    const u = new URL(supabaseUrl);
    return `${u.protocol}//${u.hostname}:54324`;
  } catch {
    return 'http://127.0.0.1:54324';
  }
}

export async function deleteAllMailpitMessages(): Promise<void> {
  await fetch(`${mailpitBaseUrl()}/api/v1/messages`, { method: 'DELETE' });
}

/**
 * Poll until an email to `toAddress` appears in Mailpit, then return it.
 * Throws if no matching email arrives within `timeoutMs`.
 */
export async function waitForEmail(toAddress: string, timeoutMs = 15_000): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${mailpitBaseUrl()}/api/v1/messages`);
    if (res.ok) {
      const body = await res.json();
      const messages: MailpitMessage[] = body.messages ?? [];
      const match = messages.find((m) =>
        m.To.some((t) => t.Address.toLowerCase() === toAddress.toLowerCase())
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
 */
export async function fetchMessageBody(messageId: string): Promise<{ html: string; text: string }> {
  const base = mailpitBaseUrl();
  const [htmlRes, textRes] = await Promise.all([
    fetch(`${base}/api/v1/message/${messageId}`),
    fetch(`${base}/api/v1/message/${messageId}/plain`),
  ]);
  const htmlBody = htmlRes.ok ? await htmlRes.text() : '';
  const textBody = textRes.ok ? await textRes.text() : '';
  return { html: htmlBody, text: textBody };
}

/** Extract the first https?:// link from an email body string. */
export function extractFirstLink(body: string): string | null {
  const match = body.match(/https?:\/\/[^\s"'<>]+/);
  return match ? match[0] : null;
}
