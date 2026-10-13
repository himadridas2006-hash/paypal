import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const isConfigured = Boolean(token && token !== 'your_telegram_bot_token_here' && chatId);

  return NextResponse.json({
    configured: isConfigured,
    chatIdMasked: chatId ? `***${chatId.slice(-4)}` : null,
    pollingMode: 'Long-Polling (Local Loop Ready)',
    status: isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    timestamp: new Date().toISOString(),
  });
}
