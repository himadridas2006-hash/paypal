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
  const escalationReasons: string[] = [];
  let riskScore = 10; // baseline low risk

  // 1. Expiry Check (Strict Hard Block)
  const isExpired = mandate.expiryDate ? new Date(mandate.expiryDate).getTime() < Date.now() : false;
  if (isExpired) {
    violations.push(`Mandate expired on ${mandate.expiryDate}. All transactions after expiry are blocked.`);
    riskScore = 100;
  }

  // 2. Restricted Categories (Strict Hard Block - Illegal / Prohibited)
  const isRestrictedCategory = mandate.restrictedCategories?.some((cat) =>
    request.category.toLowerCase().includes(cat.toLowerCase())
  ) || false;
  if (isRestrictedCategory) {
    violations.push(`Restricted category detected: "${request.category}" violates compliance governance.`);
    riskScore = Math.max(riskScore, 95);
  }

  // 3. High-Risk Blacklisted Jurisdictions (Strict Hard Block)
  const isHighRiskJurisdiction = request.jurisdiction && ['cyprus', 'russia', 'cayman', 'panama'].some(j =>
    request.jurisdiction?.toLowerCase().includes(j)
  );
  if (isHighRiskJurisdiction) {
    violations.push(`High-risk sanctioned jurisdiction detected (${request.jurisdiction}). Hard blocked.`);
    riskScore = Math.max(riskScore, 95);
  }

  // HARD BLOCK CHECK: Expired, illegal category, or sanctioned jurisdiction
  if (isExpired || isRestrictedCategory || isHighRiskJurisdiction) {
    return {
      decision: 'BLOCKED',
      riskScore: Math.min(100, riskScore),
      reason: violations[0] || 'Transaction violates strict regulatory boundaries. Hard blocked by firewall.',
      violations,
      recommendation: 'Reject transaction immediately to prevent regulatory breach.',
      requiresHumanApproval: false,
      canSettleViaPayPal: false,
      settlementLatencySeconds: 0.12,
    };
  }

  // 4. Allowed / Whitelisted Merchants Check (Escalates for Human Sign-off if unlisted)
  const hasWhitelist = mandate.whitelistedMerchants && mandate.whitelistedMerchants.length > 0;
  const isWhitelistedMerchant = hasWhitelist
    ? mandate.whitelistedMerchants.some((m) =>
        request.merchant.toLowerCase().includes(m.toLowerCase()) ||
        m.toLowerCase().includes(request.merchant.toLowerCase())
      )
    : true;
  if (hasWhitelist && !isWhitelistedMerchant) {
    escalationReasons.push(`Merchant "${request.merchant}" is not on mandate whitelist (${mandate.whitelistedMerchants.join(', ')}).`);
    riskScore = Math.max(riskScore, 65);
  }

  // 5. Review Threshold (approvalTrigger) Check
  const effectiveTrigger = mandate.approvalTrigger || mandate.perTxCap;
  if (request.amount >= effectiveTrigger) {
    escalationReasons.push(
      `Amount ($${request.amount.toFixed(2)}) meets or exceeds human review trigger of $${effectiveTrigger.toFixed(2)}.`
    );
    riskScore = Math.max(riskScore, 60);
  }

  // 6. Single Transaction Cap Check
  if (request.amount > mandate.perTxCap) {
    const percentOver = Math.round(((request.amount - mandate.perTxCap) / mandate.perTxCap) * 100);
    escalationReasons.push(
      `Amount ($${request.amount.toFixed(2)}) exceeds single-tx ceiling of $${mandate.perTxCap.toFixed(2)} (+${percentOver}% over cap).`
    );
    riskScore = Math.max(riskScore, 70);
  }

  // 7. Total Budget Headroom Check
  const remainingBudget = mandate.monthlyCap - mandate.spentAmount;
  if (request.amount > remainingBudget) {
    escalationReasons.push(
      `Request ($${request.amount.toFixed(2)}) exceeds remaining monthly budget of $${remainingBudget.toFixed(2)}.`
    );
    riskScore = Math.max(riskScore, 75);
  }

  // ESCALATION CHECK: If any governance limit triggered human review
  if (escalationReasons.length > 0) {
    return {
      decision: 'ESCALATED',
      riskScore: Math.min(84, riskScore),
      reason: escalationReasons[0],
      violations: escalationReasons,
      recommendation: 'Escalated to Approvals Queue for human manager sign-off. Settlement held.',
      requiresHumanApproval: true,
      canSettleViaPayPal: false,
      settlementLatencySeconds: 0.35,
    };
  }

  // AUTO-APPROVED: Clean inside all limits
  return {
    decision: 'APPROVED',
    riskScore: 10,
    reason: `Within mandate limits ($${request.amount.toFixed(2)} < $${mandate.approvalTrigger.toFixed(2)}) & authorized merchant.`,
    violations: [],
    recommendation: 'Auto-settle instantly via PayPal Commercial Sandbox rail.',
    requiresHumanApproval: false,
    canSettleViaPayPal: true,
    settlementLatencySeconds: 0.22,
  };
}
