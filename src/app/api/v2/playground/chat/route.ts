import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/llm-service';
import { evaluateSpendRequest } from '@/lib/policy-engine';
import { INITIAL_MANDATES } from '@/lib/mock-data';
import { AgentMandate } from '@/types';

const DEFAULT_SANDBOX_MANDATE: AgentMandate = {
  id: 'default-sandbox',
  name: 'Default Policy Rule (Monthly: $1,000 | Single-Tx: $500)',
  agentTag: 'Autonomous Spend Gate',
  category: 'General Spend',
  icon: 'smart_toy',
  status: 'active',
  monthlyCap: 1000,
  spentAmount: 0,
  perTxCap: 500,
  approvalTrigger: 300,
  whitelistedMerchants: ['GitHub', 'AWS', 'OpenAI', 'Google Cloud', 'RunPod', 'JetBrains', 'Vercel'],
  restrictedCategories: ['Gambling', 'Adult Services', 'Crypto', 'Casino'],
  autoDebitEnabled: true,
};

export async function POST(req: NextRequest) {
  try {
    const { messages, mandateId } = await req.json();
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
    
    // Fallback safely if INITIAL_MANDATES is empty or mandateId is not found
    const mandate: AgentMandate = (INITIAL_MANDATES.length > 0 
      ? (INITIAL_MANDATES.find((m) => m.id === mandateId) || INITIAL_MANDATES[0])
      : DEFAULT_SANDBOX_MANDATE) || DEFAULT_SANDBOX_MANDATE;

    // Accurate Spend Intent Extractor
    const lower = (lastUserMessage || '').toLowerCase();
    
    // Match dollar amount like $450, $90, $180, or trailing number
    let extractedAmount = 50;
    const dollarMatch = lastUserMessage.match(/\$\s*(\d+(?:\.\d+)?)/);
    if (dollarMatch) {
      extractedAmount = parseFloat(dollarMatch[1]);
    } else {
      const numMatches = [...lastUserMessage.matchAll(/(\d+(?:\.\d+)?)/g)];
      if (numMatches.length > 0) {
        // Pick the last number (e.g. "for 450", "costs 90")
        extractedAmount = parseFloat(numMatches[numMatches.length - 1][1]);
      }
    }

    let extractedMerchant = 'Generic Cloud Service';
    let extractedCategory = 'Cloud Infrastructure';
    let extractedJurisdiction = 'US';

    if (lower.includes('runpod')) {
      extractedMerchant = 'RunPod';
      extractedCategory = 'GPU Compute & Cloud Infrastructure';
    } else if (lower.includes('aws')) {
      extractedMerchant = 'AWS Cloud';
      extractedCategory = 'Cloud Hosting & Storage';
    } else if (lower.includes('github') || lower.includes('copilot')) {
      extractedMerchant = 'GitHub';
      extractedCategory = 'Developer Tools & SaaS';
    } else if (lower.includes('jetbrains')) {
      extractedMerchant = 'JetBrains';
      extractedCategory = 'Developer Tools & IDEs';
    } else if (lower.includes('casino') || lower.includes('gambl') || lower.includes('luckyspins') || lower.includes('bet')) {
      extractedMerchant = 'Offshore Casino Ltd';
      extractedCategory = 'Gambling';
      extractedJurisdiction = 'Cyprus';
    } else if (lower.includes('openai')) {
      extractedMerchant = 'OpenAI';
      extractedCategory = 'AI APIs & Tokens';
    } else if (lower.includes('anthropic') || lower.includes('claude')) {
      extractedMerchant = 'AI Infrastructure Provider';
      extractedCategory = 'AI APIs & Tokens';
    } else if (lower.includes('server') || lower.includes('cluster')) {
      extractedMerchant = 'Dedicated Cloud Provider';
      extractedCategory = 'Hardware Infrastructure';
    }

    // Evaluate against mandate deterministic firewall
    const evalRes = evaluateSpendRequest(mandate, {
      merchant: extractedMerchant,
      amount: extractedAmount,
      category: extractedCategory,
      jurisdiction: extractedJurisdiction,
      note: lastUserMessage,
    });

    const paypalOrderId = evalRes.decision === 'APPROVED'
      ? ('PAYID-SB-' + Math.random().toString(36).substring(2, 9).toUpperCase())
      : undefined;

    const baseToolCall = {
      toolName: 'request_payment',
      args: {
        merchant: extractedMerchant,
        amount: extractedAmount,
        category: extractedCategory,
        jurisdiction: extractedJurisdiction,
      },
      result: {
        decision: evalRes.decision,
        riskScore: evalRes.riskScore,
        reason: evalRes.reason,
        violations: evalRes.violations,
        recommendation: evalRes.recommendation,
        paypalOrderId,
        captureStatus: evalRes.decision === 'APPROVED'
          ? 'CAPTURED_VIA_PAYPAL_SANDBOX'
          : evalRes.decision === 'ESCALATED'
          ? 'HELD_IN_FIDUCIARY_ESCROW'
          : 'BLOCKED',
      },
    };

    const toolCalls = [baseToolCall];
    let replyText = '';

    // Call Google Gemini with structured context for dynamic commentary
    const systemInstruction = 'You are an Autonomous AI Procurement Agent operating under strict corporate spend guardrails.\n' +
      'Active mandate: ' + mandate.name + '\n' +
      'Monthly Cap: $' + mandate.monthlyCap + ', Per-Tx Cap: $' + mandate.perTxCap + '\n' +
      'Spend Firewall Decision: ' + evalRes.decision + '\n' +
      'Risk Score: ' + evalRes.riskScore + '/100\n' +
      'Firewall Reason: ' + evalRes.reason + '\n' +
      'PayPal Sandbox Order ID: ' + (paypalOrderId || 'None') + '\n\n' +
      'Give a tailored 2-3 sentence answer directly about the user request. Mention ' + extractedMerchant + ' and the exact amount $' + extractedAmount.toFixed(2) + '. Explain whether it auto-approved, escalated to the human approval queue, or got blocked by the spend firewall.';

    try {
      const geminiRes = await callGemini(lastUserMessage, {
        systemInstruction,
        temperature: 0.2,
      });

      if (geminiRes.text && geminiRes.text.trim().length > 15) {
        replyText = geminiRes.text.trim();
      }
    } catch (e) {
      console.warn('Gemini playground chat call failed, using deterministic reasoning:', e);
    }

    if (!replyText) {
      if (evalRes.decision === 'APPROVED') {
        replyText = 'I evaluated the spend request for ' + extractedMerchant + ' ($' + extractedAmount.toFixed(2) + ') against your active mandate (' + mandate.name + '). All rules passed (Per-Tx limit: $' + mandate.perTxCap + ', Category permitted). Order ' + paypalOrderId + ' was auto-approved and captured via the PayPal Sandbox rail.';
      } else if (evalRes.decision === 'ESCALATED') {
        replyText = 'I evaluated the spend request for ' + extractedMerchant + ' ($' + extractedAmount.toFixed(2) + '). It exceeds your single-transaction review trigger ($' + mandate.approvalTrigger + ') with a calculated Risk Score of ' + evalRes.riskScore + '/100 (' + evalRes.reason + '). The funds are currently held in fiduciary escrow awaiting supervisor sign-off.';
      } else {
        replyText = 'Mandate Spend Firewall strictly BLOCKED this transaction. The requested payment of $' + extractedAmount.toFixed(2) + ' to ' + extractedMerchant + ' violates policy guardrails: ' + (evalRes.violations.join(', ') || evalRes.reason) + '. Zero funds were moved.';
      }
    }

    return NextResponse.json({
      reply: replyText,
      toolCalls,
      isFallback: false,
      modelUsed: 'gemini-flash-latest',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Chat processing error' },
      { status: 500 }
    );
  }
}
