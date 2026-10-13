import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body?.event_type || 'PAYMENT.CAPTURE.COMPLETED';
    const resource = body?.resource || {};

    // Internal simulation & log
    console.log(`[PayPal Webhook Received] Type: ${eventType}, ID: ${body?.id || 'N/A'}`);

    return NextResponse.json({
      received: true,
      eventType,
      resourceId: resource.id || 'SIMULATED_WEBHOOK',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Webhook failed' }, { status: 400 });
  }
}
