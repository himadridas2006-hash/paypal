import { NextRequest, NextResponse } from 'next/server';
import { evaluateSpendRequest } from '@/lib/policy-engine';
import { INITIAL_MANDATES } from '@/lib/mock-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mandateId, merchant, amount, category = 'General Spend', jurisdiction = 'US', note } = body;

    const mandate = INITIAL_MANDATES.find((m) => m.id === mandateId) || INITIAL_MANDATES[0];
    const evaluation = evaluateSpendRequest(mandate, {
      merchant: merchant || 'Unknown Merchant',
      amount: Number(amount) || 0,
      category,
      jurisdiction,
      note,
    });

    return NextResponse.json({
      success: true,
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      reason: evaluation.reason,
      violations: evaluation.violations,
      recommendation: evaluation.recommendation,
      mandate: {
        id: mandate.id,
        name: mandate.name,
        monthlyCap: mandate.monthlyCap,
        spentAmount: mandate.spentAmount,
        perTxCap: mandate.perTxCap,
      },
      evaluationTimestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Check failed' },
      { status: 500 }
    );
  }
}
