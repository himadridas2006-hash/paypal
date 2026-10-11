import { NextResponse } from 'next/server';

export async function GET() {
  const hasPayPalId = !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const hasPayPalSecret = !!process.env.PAYPAL_CLIENT_SECRET;

  return NextResponse.json({
    status: 'ok',
    paypalConnected: hasPayPalId && hasPayPalSecret,
    mode: 'sandbox_live',
    environment: 'sandbox',
    timestamp: new Date().toISOString(),
  });
}
