import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCalcomSignature,
  processCalcomBookingPayload,
  type CalcomBookingPayload,
} from '@/lib/services/calcom';
import {
  cancelCalcomBooking,
  rescheduleCalcomBooking,
} from '@/lib/services/calcom-booking-changes';
import {
  CalcomCancelPayloadSchema,
  CalcomReschedulePayloadSchema,
  parseCalcomEmail,
} from '@/schemas/CalcomWebhookSchema';
import { logger } from '@/lib/logger';

const ok = (result: unknown) => NextResponse.json({ success: true, result }, { status: 200 });
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

/**
 * One handler per booking event; anything else (meeting events, payments, …)
 * is acknowledged and ignored so Cal.com does not retry it.
 */
async function handleEvent(
  triggerEvent: string | undefined,
  rawPayload: Partial<CalcomBookingPayload> | undefined
): Promise<NextResponse> {
  if (triggerEvent === 'BOOKING_CANCELLED') {
    const parsed = CalcomCancelPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) return badRequest('Invalid booking uid');
    return ok(await cancelCalcomBooking(parsed.data.uid));
  }

  if (triggerEvent !== 'BOOKING_CREATED' && triggerEvent !== 'BOOKING_RESCHEDULED') {
    return NextResponse.json({ ignored: triggerEvent ?? null }, { status: 200 });
  }

  const payload = { ...rawPayload, triggerEvent } as CalcomBookingPayload;
  if (!parseCalcomEmail(payload.attendees?.[0]?.email)) {
    return badRequest('Invalid attendee email');
  }
  if (triggerEvent === 'BOOKING_CREATED') return ok(await processCalcomBookingPayload(payload));

  const change = CalcomReschedulePayloadSchema.safeParse(rawPayload);
  if (!change.success) return badRequest('Invalid reschedule payload');
  return ok(await rescheduleCalcomBooking(change.data, payload));
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET;
    // Fail closed: a missing secret must never turn into "accept everything".
    if (!webhookSecret) {
      logger.error('[Cal.com Webhook] CALCOM_WEBHOOK_SECRET is not configured; request rejected');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-cal-signature-256');
    if (!verifyCalcomSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    let envelope: { triggerEvent?: string; payload?: Partial<CalcomBookingPayload> } | null;
    try {
      envelope = JSON.parse(rawBody);
    } catch {
      envelope = null;
    }
    if (!envelope || typeof envelope !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    return await handleEvent(envelope.triggerEvent, envelope.payload);
  } catch (err: unknown) {
    // Details go to the log only; the caller gets a fixed message.
    logger.error('[Cal.com Webhook Error]:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
