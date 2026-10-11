import { NextResponse } from 'next/server';

export async function GET() {
  const hasPayPalId = !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const hasPayPalSecret = !!process.env.PAYPAL_CLIENT_SECRET;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;

  return NextResponse.json({
    status: 'ONLINE',
    service: 'Mandate AI Spend Firewall Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      paypal_create_order: 'POST /api/paypal/create-order',
      paypal_capture_order: 'POST /api/paypal/capture-order',
      gemini_ai_arbitrate: 'POST /api/ai/arbitrate',
      health_check: 'GET /api/backend',
    },
    integrations: {
      paypal_sandbox: {
        status: hasPayPalId && hasPayPalSecret ? 'CONFIGURED' : 'PENDING_KEYS',
        mode: 'sandbox',
        base_url: process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com',
      },
      gemini_ai: {
        status: hasGeminiKey ? 'CONFIGURED' : 'PENDING_KEY',
        model: 'gemini-1.5-flash',
      },
    },
    telemetry: {
      active_mandates: 5,
      vault_liquidity: 142580.0,
      daily_velocity_committed: 10720.0,
      guardrail_blocks_today: 4,
    },
  });
}
