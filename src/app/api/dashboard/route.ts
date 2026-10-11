import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    vault: {
      totalPool: 142580.0,
      currency: 'USD',
      committedVelocityToday: 10720.0,
      availableRunway: 131860.0,
    },
    metrics: {
      budgetRemaining: 14280.0,
      totalBudgetPool: 25000.0,
      budgetUtilizationPercent: 57.1,
      todayTxsClearedCount: 18,
      todayPayPalClearedTotal: 2410.5,
      guardrailBlockedTxsCount: 4,
      capitalProtectedTotal: 1850.0,
      pendingHumanApprovalCount: 3,
    },
    latencySeconds: 0.24,
    timestamp: new Date().toISOString(),
  });
}
