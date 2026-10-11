import { NextResponse } from 'next/server';
import { INITIAL_TRANSACTIONS } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    totalEntries: INITIAL_TRANSACTIONS.length,
    ledger: INITIAL_TRANSACTIONS.map((tx) => ({
      id: tx.id,
      merchant: tx.merchant,
      amount: tx.amount,
      status: tx.status,
      riskScore: tx.riskScore,
      rule: tx.badgeText,
      timestamp: tx.timestamp,
      paypalOrderId: tx.paypalOrderId || null,
      breachReason: tx.breachReason || null,
    })),
    tamperEvidentSignature: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timestamp: new Date().toISOString(),
  });
}
