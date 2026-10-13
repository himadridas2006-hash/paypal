import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || token === 'your_telegram_bot_token_here' || !chatId) {
    return NextResponse.json({
      success: false,
      configured: false,
      message: 'Telegram Bot is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local to enable remote mobile approvals.',
    });
  }

  try {
    const text = `🛡️ *MANDATE FIDUCIARY INTERCEPT ALERT*\n\n⚡ *Merchant:* RunPod GPU Cluster\n💰 *Amount:* $450.00 USD\n⚠️ *Breach:* Single-transaction limit exceeded ($150 cap)\n📊 *Risk Score:* 65/100 (Held in Fiduciary Escrow)\n\n_Reply or tap below to authorize via PayPal Sandbox:_`;

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve via PayPal', callback_data: 'approve_app-test' },
              { text: '❌ Deny Payment', callback_data: 'deny_app-test' },
            ],
          ],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json({
        success: false,
        message: data.description || 'Failed to dispatch Telegram message',
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      message: 'Test approval message dispatched to configured Telegram chat!',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err?.message || 'Telegram network dispatch error',
    });
  }
}
