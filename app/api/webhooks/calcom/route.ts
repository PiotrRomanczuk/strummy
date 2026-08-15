import { NextRequest, NextResponse } from 'next/server';
import { verifyCalcomSignature, processCalcomBookingPayload } from '@/lib/services/calcom';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-cal-signature-256');
    const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET;

    if (!verifyCalcomSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    const envelope = JSON.parse(rawBody);
    const payload = { triggerEvent: envelope.triggerEvent, ...envelope.payload };
    const result = await processCalcomBookingPayload(payload);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[Cal.com Webhook Error]:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
