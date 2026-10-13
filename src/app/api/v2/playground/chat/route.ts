import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/llm-service';
import { evaluateSpendRequest } from '@/lib/policy-engine';
import { INITIAL_MANDATES } from '@/lib/mock-data';

export async function POST(req: NextRequest) {
  try {
    const { messages, mandateId } = await req.json();
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
    const mandate = INITIAL_MANDATES.find((m) => m.id === mandateId) || INITIAL_MANDATES[0];

    const systemInstruction = `You are an Autonomous AI Procurement Agent operating under strict corporate spend guardrails.
Your active mandate is: "${mandate.name}" with a Monthly Budget Cap of $${mandate.monthlyCap}, Single-Transaction Cap of $${mandate.perTxCap}, and Whitelisted Merchants: ${mandate.whitelistedMerchants.join(', ')}.

When the user asks you to buy, reserve, or purchase anything, YOU MUST use the request_payment tool to request payment authorization through the Mandate Spend Firewall.
Do not pretend to pay directly. Call request_payment with:
- merchant: the merchant name
- amount: the numeric amount in USD
- category: spend category
- note: brief reason

If the user asks about rules or mandates, use list_mandates or check_mandate.`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'request_payment',
            description: 'Execute or request payment authorization through the Mandate spend firewall',
            parameters: {
              type: 'OBJECT',
              properties: {
                merchant: { type: 'STRING', description: 'Merchant name' },
                amount: { type: 'NUMBER', description: 'Amount in USD' },
                category: { type: 'STRING', description: 'Category' },
                jurisdiction: { type: 'STRING', description: 'Country code or name' },
                note: { type: 'STRING', description: 'Reason for purchase' },
              },
              required: ['merchant', 'amount'],
            },
          },
          {
            name: 'check_mandate',
            description: 'Pre-screen spend request without moving funds',
            parameters: {
              type: 'OBJECT',
              properties: {
                merchant: { type: 'STRING', description: 'Merchant name' },
                amount: { type: 'NUMBER', description: 'Amount in USD' },
              },
              required: ['merchant', 'amount'],
            },
          },
        ],
      },
    ];

    const geminiRes = await callGemini(lastUserMessage, {
      systemInstruction,
      tools,
      temperature: 0.1,
    });

    let toolCalls: any[] = [];
    let replyText = geminiRes.text;

    if (geminiRes.functionCalls && geminiRes.functionCalls.length > 0) {
      for (const fc of geminiRes.functionCalls) {
        if (fc.name === 'request_payment') {
          const evalRes = evaluateSpendRequest(mandate, {
            merchant: fc.args.merchant || 'Unknown Merchant',
            amount: Number(fc.args.amount) || 0,
            category: fc.args.category || 'Software & Cloud Services',
            jurisdiction: fc.args.jurisdiction || 'US',
            note: fc.args.note,
          });

          const paypalOrderId = evalRes.decision === 'APPROVED'
            ? `PAYID-SB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
            : undefined;

          toolCalls.push({
            toolName: 'request_payment',
            args: fc.args,
            result: {
              decision: evalRes.decision,
              riskScore: evalRes.riskScore,
              reason: evalRes.reason,
              violations: evalRes.violations,
              recommendation: evalRes.recommendation,
              paypalOrderId,
              captureStatus: evalRes.decision === 'APPROVED' ? 'CAPTURED_VIA_PAYPAL_SANDBOX' : evalRes.decision === 'ESCALATED' ? 'HELD_IN_FIDUCIARY_ESCROW' : 'BLOCKED',
            },
          });
        }
      }

      if (!replyText) {
        const first = toolCalls[0];
        if (first.result.decision === 'APPROVED') {
          replyText = `I evaluated this purchase through your Mandate Spend Firewall. The policy check PASSED (Auto-Approved) and captured via PayPal Sandbox (Order: ${first.result.paypalOrderId}).`;
        } else if (first.result.decision === 'ESCALATED') {
          replyText = `I submitted the spend request, but it triggered a fiduciary threshold escalation (${first.result.reason}). It is currently quarantined in your Approvals Queue for human sign-off.`;
        } else {
          replyText = `I attempted to process this payment, but the Mandate Firewall strictly BLOCKED it due to policy violation: ${first.result.reason}.`;
        }
      }
    } else if (geminiRes.isFallback) {
      // Deterministic scripted agent fallback
      const lower = lastUserMessage.toLowerCase();
      let extractedAmount = 50;
      const amountMatch = lastUserMessage.match(/\$?(\d+(\.\d+)?)/);
      if (amountMatch) extractedAmount = parseFloat(amountMatch[1]);

      let extractedMerchant = 'Generic Cloud Service';
      if (lower.includes('runpod')) extractedMerchant = 'RunPod';
      else if (lower.includes('aws')) extractedMerchant = 'AWS';
      else if (lower.includes('github') || lower.includes('copilot')) extractedMerchant = 'GitHub';
      else if (lower.includes('casino') || lower.includes('gambl')) extractedMerchant = 'Offshore Casino Ltd';
      else if (lower.includes('openai')) extractedMerchant = 'OpenAI';

      const evalRes = evaluateSpendRequest(mandate, {
        merchant: extractedMerchant,
        amount: extractedAmount,
        category: lower.includes('gambl') ? 'Gambling' : 'Cloud Infrastructure',
        jurisdiction: lower.includes('gambl') ? 'Cyprus' : 'US',
        note: 'Simulated Agent Request',
      });

      const paypalOrderId = evalRes.decision === 'APPROVED'
        ? `PAYID-SB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        : undefined;

      toolCalls.push({
        toolName: 'request_payment',
        args: { merchant: extractedMerchant, amount: extractedAmount },
        result: {
          decision: evalRes.decision,
          riskScore: evalRes.riskScore,
          reason: evalRes.reason,
          violations: evalRes.violations,
          recommendation: evalRes.recommendation,
          paypalOrderId,
          captureStatus: evalRes.decision === 'APPROVED' ? 'CAPTURED_VIA_PAYPAL_SANDBOX' : evalRes.decision === 'ESCALATED' ? 'HELD_IN_FIDUCIARY_ESCROW' : 'BLOCKED',
        },
      });

      replyText = evalRes.decision === 'APPROVED'
        ? `[Deterministic Agent] Request for $${extractedAmount} at ${extractedMerchant} cleared policies and captured order ${paypalOrderId} via PayPal Sandbox.`
        : evalRes.decision === 'ESCALATED'
        ? `[Deterministic Agent] Request for $${extractedAmount} at ${extractedMerchant} exceeded threshold (${evalRes.reason}). Held in Fiduciary Escrow for human approval.`
        : `[Deterministic Agent] Request for $${extractedAmount} at ${extractedMerchant} was strictly BLOCKED by policy firewall: ${evalRes.reason}.`;
    }

    return NextResponse.json({
      reply: replyText,
      toolCalls,
      isFallback: geminiRes.isFallback,
      modelUsed: geminiRes.model,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Chat processing error' },
      { status: 500 }
    );
  }
}
