import { AgentMandate } from '@/types';

export interface PolicyEvaluationResult {
  decision: 'APPROVED' | 'ESCALATED' | 'BLOCKED';
  riskScore: number;
  reason: string;
  violations: string[];
  recommendation: string;
  requiresHumanApproval: boolean;
  canSettleViaPayPal: boolean;
  settlementLatencySeconds: number;
}

export function evaluateSpendRequest(
  mandate: AgentMandate,
  request: {
    merchant: string;
    amount: number;
    category: string;
    jurisdiction?: string;
    note?: string;
  }
): PolicyEvaluationResult {
  const violations: string[] = [];
  let riskScore = 10; // baseline low risk

  // 1. Expiry Check (Hard Block)
  const isExpired = mandate.expiryDate ? new Date(mandate.expiryDate).getTime() < Date.now() : false;
  if (isExpired) {
    violations.push(`Mandate expired on ${mandate.expiryDate}. All transactions after expiry are blocked.`);
    riskScore = 100;
  }

  // 2. Restricted Categories (Hard Block)
  const isRestrictedCategory = mandate.restrictedCategories?.some((cat) =>
    request.category.toLowerCase().includes(cat.toLowerCase())
  ) || false;
  if (isRestrictedCategory) {
    violations.push(`Restricted category detected: "${request.category}" violates governance mandate.`);
    riskScore = Math.max(riskScore, 95);
  }

  // 3. Allowed / Whitelisted Merchants (Hard Block if specified and unlisted)
  const hasWhitelist = mandate.whitelistedMerchants && mandate.whitelistedMerchants.length > 0;
  const isWhitelistedMerchant = hasWhitelist
    ? mandate.whitelistedMerchants.some((m) =>
        request.merchant.toLowerCase().includes(m.toLowerCase())
      )
    : true;
  if (hasWhitelist && !isWhitelistedMerchant) {
    violations.push(`Merchant "${request.merchant}" is not in the allowed merchants list. Blocked by spend firewall.`);
    riskScore = Math.max(riskScore, 90);
  }

  // 4. Single Transaction Cap (Hard Block if exceeded)
  const isOverPerTxCap = request.amount > mandate.perTxCap;
  if (isOverPerTxCap) {
    const percentOver = Math.round(((request.amount - mandate.perTxCap) / mandate.perTxCap) * 100);
    violations.push(
      `Amount ($${request.amount.toFixed(2)}) exceeds single-transaction cap of $${mandate.perTxCap.toFixed(2)} (+${percentOver}% over cap). Blocked by spend firewall.`
    );
    riskScore = Math.max(riskScore, 92);
  }

  // 5. Total Budget Headroom (Hard Block if exceeded)
  const remainingBudget = mandate.monthlyCap - mandate.spentAmount;
  const isOverBudget = request.amount > remainingBudget;
  if (isOverBudget) {
    violations.push(
      `Request ($${request.amount.toFixed(2)}) exceeds available mandate budget ($${remainingBudget.toFixed(2)}). Blocked by spend firewall.`
    );
    riskScore = Math.max(riskScore, 90);
  }

  // 6. Suspicious Jurisdictions
  if (request.jurisdiction && ['cyprus', 'russia', 'cayman', 'panama'].some(j => request.jurisdiction?.toLowerCase().includes(j))) {
    violations.push(`High-risk jurisdiction detected (${request.jurisdiction}). Whitelist enforced.`);
    riskScore = Math.max(riskScore, 85);
  }

  // Bound risk score 0 - 100
  riskScore = Math.min(100, Math.max(0, riskScore));

  // HARD BLOCK CHECK: Expired, non-allowed merchant, over per-tx cap, over budget, or restricted category
  if (isExpired || (hasWhitelist && !isWhitelistedMerchant) || isOverPerTxCap || isOverBudget || isRestrictedCategory || riskScore >= 85) {
    return {
      decision: 'BLOCKED',
      riskScore,
      reason: violations[0] || 'Transaction violates mandate policy boundaries. Blocked by Spend Firewall.',
      violations,
      recommendation: 'Reject transaction immediately to prevent capital leakage.',
      requiresHumanApproval: false,
      canSettleViaPayPal: false,
      settlementLatencySeconds: 0.12,
    };
  }

  // REVIEW THRESHOLD CHECK: Amount above review threshold (approvalTrigger)
  const isAboveReviewThreshold = request.amount >= mandate.approvalTrigger;
  if (isAboveReviewThreshold || riskScore >= 40) {
    violations.push(
      `Amount ($${request.amount.toFixed(2)}) exceeds review threshold ($${mandate.approvalTrigger.toFixed(2)}). Escrowed for human approval.`
    );
    return {
      decision: 'ESCALATED',
      riskScore: Math.max(45, riskScore),
      reason: `Transaction exceeds review threshold ($${mandate.approvalTrigger.toFixed(2)}). Escrowed for human sign-off.`,
      violations,
      recommendation: 'Escalate to fiduciary Approvals Queue. PayPal settlement on hold.',
      requiresHumanApproval: true,
      canSettleViaPayPal: false,
      settlementLatencySeconds: 0.45,
    };
  }

  // AUTO-APPROVED: Inside all mandate limits
  return {
    decision: 'APPROVED',
    riskScore,
    reason: `Within mandate limits ($${request.amount.toFixed(2)} < $${mandate.approvalTrigger.toFixed(2)} threshold) & authorized merchant.`,
    violations: [],
    recommendation: 'Auto-settle instantly via PayPal Commercial Sandbox rail.',
    requiresHumanApproval: false,
    canSettleViaPayPal: true,
    settlementLatencySeconds: 0.24,
  };
}
