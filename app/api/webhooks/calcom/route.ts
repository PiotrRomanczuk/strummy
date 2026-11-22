import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCalcomSignature,
  processCalcomBookingPayload,
  type CalcomBookingPayload,
} from '@/lib/services/calcom';
import { parseCalcomEmail } from '@/schemas/CalcomWebhookSchema';
import { logger } from '@/lib/logger';

const HANDLED_EVENT = 'BOOKING_CREATED';

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

    // Only a new booking creates a lesson; cancellations, reschedules and
    // meeting events must not be replayed as bookings.
    if (envelope.triggerEvent !== HANDLED_EVENT) {
      return NextResponse.json({ ignored: envelope.triggerEvent ?? null }, { status: 200 });
    }

    const payload = { ...envelope.payload, triggerEvent: HANDLED_EVENT } as CalcomBookingPayload;
    if (!parseCalcomEmail(payload.attendees?.[0]?.email)) {
      return NextResponse.json({ error: 'Invalid attendee email' }, { status: 400 });
    }

    const result = await processCalcomBookingPayload(payload);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err: unknown) {
    // Details go to the log only; the caller gets a fixed message.
    logger.error('[Cal.com Webhook Error]:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
