import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/llm-service';

export async function POST(req: NextRequest) {
  try {
    const { buyerMandate, sellerService, targetPrice } = await req.json();

    const buyerCap = buyerMandate?.perTxCap || 400;
    const initialAsk = Math.round(targetPrice * 1.25);

    // Call unified Gemini service or deterministic fallback
    const prompt = `Simulate a brief 3-round B2B negotiation between:
1. Buyer Agent: Mandate Cap $${buyerCap}. Task: Purchase "${sellerService}". Goal: minimize spend.
2. Seller Agent: Asking $${initialAsk}. Min acceptable price: $${targetPrice * 0.9}. Goal: maximize revenue.

Generate a JSON object with:
- rounds: array of 3 objects each having { round: number, buyerOffer: number, sellerCounter: number, dialogue: string }
- agreedPrice: number
- status: "AGREED" | "NO_DEAL"
- settlementNote: string`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        rounds: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              round: { type: 'NUMBER' },
              buyerOffer: { type: 'NUMBER' },
              sellerCounter: { type: 'NUMBER' },
              dialogue: { type: 'STRING' },
            },
          },
        },
        agreedPrice: { type: 'NUMBER' },
        status: { type: 'STRING' },
        settlementNote: { type: 'STRING' },
      },
    };

    const geminiRes = await callGemini(prompt, {
      responseSchema,
      temperature: 0.2,
    });

    let result: any = null;
    if (!geminiRes.isFallback && geminiRes.text) {
      try {
        result = JSON.parse(geminiRes.text);
      } catch (e) {}
    }

    if (!result) {
      // Deterministic negotiation fallback
      const finalPrice = Math.min(buyerCap - 20, Math.round(targetPrice * 0.95));
      result = {
        rounds: [
          { round: 1, buyerOffer: Math.round(finalPrice * 0.75), sellerCounter: initialAsk, dialogue: `Buyer offered $${Math.round(finalPrice * 0.75)}; Seller countered at $${initialAsk} citing SLA guarantees.` },
          { round: 2, buyerOffer: Math.round(finalPrice * 0.88), sellerCounter: Math.round(initialAsk * 0.9), dialogue: `Buyer cited policy limit and countered $${Math.round(finalPrice * 0.88)}; Seller adjusted to $${Math.round(initialAsk * 0.9)}.` },
          { round: 3, buyerOffer: finalPrice, sellerCounter: finalPrice, dialogue: `Consensus reached at $${finalPrice}. Both agents sign cryptographic contract within mandate bounds.` },
        ],
        agreedPrice: finalPrice,
        status: 'AGREED',
        settlementNote: `Contract finalized at $${finalPrice} USD. PayPal Sandbox Order ready for settlement capture.`,
      };
    }

    const paypalOrderId = `PAYID-MKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      result,
      paypalOrderId,
      capturedAt: new Date().toISOString(),
      isFallback: geminiRes.isFallback,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Negotiation failed' }, { status: 500 });
  }
}
