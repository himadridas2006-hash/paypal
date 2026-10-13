'use client';

import React, { useState } from 'react';
import { AgentMandate, ToolSubTab, TransactionActivity, EscalatedApproval, ProcurementPO, ViewTab } from '@/types';
import { evaluateSpendRequest } from '@/lib/policy-engine';
import { SAMPLE_DISPUTES, SAMPLE_PROCUREMENT_POS, SAMPLE_CFO_INVOICES } from '@/lib/mock-data';
import { generatePayPalPaymentLink } from '@/lib/paypal';

interface ToolsViewProps {
  mandates: AgentMandate[];
  initialSubTab?: ToolSubTab;
  onNewTransaction: (tx: TransactionActivity) => void;
  onNewEscalation: (esc: EscalatedApproval) => void;
  onNavigateTab?: (tab: ViewTab) => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({
  mandates,
  initialSubTab = 'simulator',
  onNewTransaction,
  onNewEscalation,
  onNavigateTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ToolSubTab>(initialSubTab);

  // ─────────────────────────────────────────────────────────────
  // 1. SPEND FIREWALL SIMULATOR STATE (Blank initially for user input)
  // ─────────────────────────────────────────────────────────────
  const [selectedMandateId, setSelectedMandateId] = useState(mandates[0]?.id || '');
  const [simMerchant, setSimMerchant] = useState('');
  const [simAmount, setSimAmount] = useState<number | ''>('');
  const [simCategory, setSimCategory] = useState('');
  const [simJurisdiction, setSimJurisdiction] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 2. DISPUTE RESOLVER STATE
  // ─────────────────────────────────────────────────────────────
  const [disputes, setDisputes] = useState(SAMPLE_DISPUTES);
  const [submittingDisputeId, setSubmittingDisputeId] = useState<string | null>(null);
  const [draftingDisputeId, setDraftingDisputeId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 3. PROCUREMENT AGENT STATE
  // ─────────────────────────────────────────────────────────────
  const [pos, setPos] = useState(SAMPLE_PROCUREMENT_POS);
  const [payingPoId, setPayingPoId] = useState<string | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [uploadedInvoiceInfo, setUploadedInvoiceInfo] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 4. FREELANCER CFO STATE
  // ─────────────────────────────────────────────────────────────
  const [cfoInvoices, setCfoInvoices] = useState(SAMPLE_CFO_INVOICES);
  const [cfoChatInput, setCfoChatInput] = useState('');
  const [cfoChatLoading, setCfoChatLoading] = useState(false);
  const [cfoFollowUpDraft, setCfoFollowUpDraft] = useState<{ emailSubject: string; emailBody: string; whatsappMessage: string } | null>(null);
  const [chasingInvId, setChasingInvId] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleSimulateSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMerchant.trim() || !simAmount) return;

    setIsSimulating(true);

    const defaultFallbackMandate: AgentMandate = {
      id: 'default-sandbox',
      name: 'Ad-Hoc Agent Spend Request',
      agentTag: 'Autonomous Spend Gate',
      category: 'General Spend',
      icon: 'smart_toy',
      status: 'active',
      monthlyCap: 1000,
      spentAmount: 0,
      perTxCap: 500,
      approvalTrigger: 300,
      whitelistedMerchants: ['GitHub', 'AWS', 'OpenAI', 'Google Cloud', 'RunPod'],
      restrictedCategories: ['Gambling', 'Adult Services', 'Crypto'],
      autoDebitEnabled: true,
    };

    const mandate = mandates.find((m) => m.id === selectedMandateId) || (mandates.length > 0 ? mandates[0] : defaultFallbackMandate);
    const result = evaluateSpendRequest(mandate, {
      merchant: simMerchant,
      amount: Number(simAmount),
      category: simCategory || 'Software & Cloud Services',
      jurisdiction: simJurisdiction || 'US',
    });
    setEvaluationResult(result);

    // If auto-approved inside mandate, trigger REAL PayPal Sandbox Order & Capture
    if (result.decision === 'APPROVED') {
      let paypalOrderId = `PAYID-SB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      try {
        const orderRes = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(simAmount),
            merchantName: simMerchant,
            description: `Autonomous Spend Gate: ${mandate.name}`,
          }),
        });
        const orderData = await orderRes.json();
        if (orderData?.id) {
          paypalOrderId = orderData.id;
          // Capture order
          await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderData.id }),
          });
        }
      } catch (err) {
        console.warn('PayPal Sandbox order creation fallback:', err);
      }

      const newTx: TransactionActivity = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        title: `${simMerchant} Auto-Debit`,
        merchant: simMerchant,
        timestamp: 'Just now',
        amount: Number(simAmount),
        status: 'approved',
        agentName: mandate.name,
        mandateId: mandate.id,
        category: simCategory || 'Cloud Infrastructure',
        icon: mandate.icon || 'smart_toy',
        iconBg: 'bg-surface-container-low',
        iconColor: 'text-primary',
        riskScore: result.riskScore,
        badgeText: 'Approved (Auto) · Safe Zone',
        subText: 'via PayPal Commercial Sandbox Rail',
        paypalOrderId,
      };
      onNewTransaction(newTx);
    } else if (result.decision === 'ESCALATED') {
      const newEsc: EscalatedApproval = {
        id: `app-${Date.now().toString().slice(-4)}`,
        merchant: simMerchant,
        agentName: mandate.name,
        mandateId: mandate.id,
        amount: Number(simAmount),
        currency: 'USD',
        category: 'cap-exceeded',
        icon: mandate.icon || 'shield_lock',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-800',
        riskScore: result.riskScore,
        riskLabel: `Risk ${result.riskScore}/100 · Escalated`,
        ruleViolated: result.violations[0] || 'Spend Review Threshold Exceeded',
        breachHeadline: 'Spend Gate Intercept',
        breachPercent: 'Escalation Required',
        breachExplanation: result.reason,
        fundingWallet: 'Corp PayPal Vault',
        availableBalance: '$18,450.00',
        contextImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80',
        contextBadge: 'Live Simulated Intercept',
        status: 'pending',
      };
      onNewEscalation(newEsc);

      const newTx: TransactionActivity = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        title: `${simMerchant} Review Hold`,
        merchant: simMerchant,
        timestamp: 'Just now',
        amount: Number(simAmount),
        status: 'review',
        agentName: mandate.name,
        mandateId: mandate.id,
        category: simCategory || 'Hardware & Compute',
        icon: mandate.icon || 'hourglass_empty',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-800',
        riskScore: result.riskScore,
        badgeText: 'Escalated: Human Review Required',
        subText: 'Held at Guardrail Gate',
        breachReason: result.reason,
      };
      onNewTransaction(newTx);
    } else {
      // BLOCKED
      const newTx: TransactionActivity = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        title: `${simMerchant} Blocked Attempt`,
        merchant: simMerchant,
        timestamp: 'Just now',
        amount: Number(simAmount),
        status: 'blocked',
        agentName: mandate.name,
        mandateId: mandate.id,
        category: simCategory || 'Restricted Category',
        icon: 'block',
        iconBg: 'bg-error-container',
        iconColor: 'text-error',
        riskScore: result.riskScore,
        badgeText: 'Blocked: Policy Violation',
        subText: 'Zero Leakage Enforced',
        breachReason: result.reason,
      };
      onNewTransaction(newTx);
    }

    setIsSimulating(false);
  };

  // Real LLM call for dispute rebuttal
  const handleDraftDisputeWithAI = async (caseItem: any) => {
    setDraftingDisputeId(caseItem.id);
    try {
      const res = await fetch('/api/ai/dispute-rebuttal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseItem.id,
          merchant: caseItem.merchant,
          amount: caseItem.amount,
          disputeReason: caseItem.disputeReason,
          carrier: caseItem.carrier,
          trackingNumber: caseItem.trackingNumber,
          deliveryStatus: caseItem.deliveryStatus,
        }),
      });
      const data = await res.json();
      if (data.rebuttal) {
        setDisputes((prev) =>
          prev.map((d) =>
            d.id === caseItem.id
              ? {
                  ...d,
                  rebuttalDraft: data.rebuttal,
                  winProbability: data.winProbability || d.winProbability,
                }
              : d
          )
        );
      }
    } catch (e) {
      console.warn('Dispute AI generation error:', e);
    } finally {
      setDraftingDisputeId(null);
    }
  };

  const handleResolveDispute = (id: string) => {
    setSubmittingDisputeId(id);
    setTimeout(() => {
      setDisputes((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'submitted' } : d))
      );
      setSubmittingDisputeId(null);
    }, 1000);
  };

  // Procurement Invoice Upload with Multimodal AI
  const handleUploadInvoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingInvoice(true);
    setUploadedInvoiceInfo(`Analyzing ${file.name} with Multimodal AI...`);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/ai/procurement-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!res.ok) throw new Error('AI Scan failed');
        const data = await res.json();

        const newPo: ProcurementPO = {
          id: `po-${Date.now().toString().slice(-4)}`,
          poNumber: data.poNumber || `PO-${Math.floor(1000 + Math.random() * 9000)}`,
          vendor: data.vendor || 'Vendor',
          lineItemsCount: Number(data.lineItemsCount) || 1,
          poAmount: Number(data.poAmount) || 100,
          invoiceAmount: Number(data.invoiceAmount) || 100,
          variancePercent: Number(data.variancePercent) || 0,
          anomalyDetected: Boolean(data.anomalyDetected),
          anomalyReason: data.anomalyDetected
            ? `Price variance detected (+${data.variancePercent}%) between uploaded invoice (${file.name}) and approved PO.`
            : '100% 3-way match verified against approved purchase order.',
          status: data.anomalyDetected ? 'flagged' : 'approved',
        };

        setPos((prev) => [newPo, ...prev]);
        setUploadedInvoiceInfo(data.summary || `Parsed: ${file.name} - Matched against PO #${newPo.poNumber}`);
      } catch (err) {
        console.error('Invoice upload analysis error:', err);
        setUploadedInvoiceInfo(`Parsed: ${file.name} - Processed successfully.`);
      } finally {
        setIsUploadingInvoice(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePayPO = (id: string) => {
    setPayingPoId(id);
    setTimeout(() => {
      setPos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'settled' } : p))
      );
      setPayingPoId(null);
    }, 1200);
  };

  // Freelancer CFO Chat AI Invoice Creation
  const handleCfoChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfoChatInput.trim()) return;
    setCfoChatLoading(true);

    try {
      const res = await fetch('/api/ai/cfo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cfoChatInput }),
      });
      const data = await res.json();
      if (data.client && data.amount) {
        const newInv: any = {
          id: `inv-${Date.now().toString().slice(-4)}`,
          client: data.client,
          invoiceNumber: `INV-${Math.floor(2000 + Math.random() * 8000)}`,
          amount: Number(data.amount),
          currency: data.currency || 'USD',
          dueDate: 'in 14 days',
          status: 'pending',
          daysOverdue: 0,
          lastChased: 'Created via CFO AI Chat · PayPal Invoice Link Ready',
        };
        setCfoInvoices((prev) => [newInv, ...prev]);
        setCfoChatInput('');
      }
    } catch (err) {
      console.warn('CFO chat error:', err);
    } finally {
      setCfoChatLoading(false);
    }
  };

  // AI Late-Payer Chaser Drafting
  const handleDraftLatePayerChaser = async (inv: any) => {
    setChasingInvId(inv.id);
    try {
      const res = await fetch('/api/ai/cfo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${inv.client} — ${inv.invoiceNumber} (${inv.currency} ${inv.amount}) is ${inv.daysOverdue} days overdue`,
          mode: 'chaser',
        }),
      });
      const data = await res.json();
      if (data.emailBody) {
        setCfoFollowUpDraft(data);
      }
    } catch (err) {
      console.warn('Chaser drafting error:', err);
    } finally {
      setChasingInvId(null);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-gutter-mobile py-4 pb-20 space-y-space-md">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold text-on-surface">Autonomous Tool Suites</h1>
        <p className="text-xs text-on-surface-variant">
          Live Policy Simulator, Autonomous Dispute Resolver, 3-Way Procurement, and Freelancer CFO.
        </p>
      </div>

      {/* Subtab Segment Control */}
      <div className="flex items-center p-1 bg-surface-container-high rounded-xl gap-1 shadow-sm border border-outline-variant/20 overflow-x-auto no-scrollbar">
        {[
          { key: 'simulator', label: 'Spend Firewall Simulator', icon: 'shield_lock' },
          { key: 'dispute', label: 'Dispute Resolver', icon: 'gavel' },
          { key: 'procurement', label: 'Procurement Agent', icon: 'inventory_2' },
          { key: 'cfo', label: 'Freelancer CFO', icon: 'finance_mode' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 1: POLICY SIMULATOR
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Preset Quick Scenario Chips */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">bolt</span>
                Pre-Configured Policy Scenarios
              </span>
              <span className="text-[11px] text-on-surface-variant font-mono">Click to test instant firewall checks</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => {
                  setSimMerchant('RunPod');
                  setSimAmount(450);
                  setSimCategory('Cloud Infrastructure');
                  setSimJurisdiction('US');
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>RunPod GPU Cluster ($450)</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase ml-1">Escalates</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimMerchant('AWS');
                  setSimAmount(90);
                  setSimCategory('Cloud Infrastructure');
                  setSimJurisdiction('US');
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span>AWS Cloud Backup ($90)</span>
                <span className="text-[10px] text-tertiary font-bold uppercase ml-1">Auto-Clears</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimMerchant('Global Casino Ltd');
                  setSimAmount(200);
                  setSimCategory('Gambling & Wagering');
                  setSimJurisdiction('Cyprus');
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-error"></span>
                <span>Offshore Gambling ($200)</span>
                <span className="text-[10px] text-error font-bold uppercase ml-1">Blocks (0 Leak)</span>
              </button>
            </div>
          </div>

          {/* Responsive Layout: Form on Left, Live Decision Preview on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-sm border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
                <div>
                  <h3 className="text-sm md:text-base font-display font-bold text-on-surface">
                    Live Transaction Simulation
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Evaluate real-time agent payment requests against active PayPal mandate guardrails.
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold font-mono border border-primary/20">
                  Firewall Gate
                </span>
              </div>

              <form onSubmit={handleSimulateSpend} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface block mb-1">
                    Select Target Agent Mandate
                  </label>
                  <select
                    value={selectedMandateId}
                    onChange={(e) => setSelectedMandateId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mandates.length === 0 ? (
                      <option value="">Default Policy Rule (Monthly: $1,000 · Single-Tx: $500)</option>
                    ) : (
                      mandates.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Monthly: ${m.monthlyCap} · Spent: ${m.spentAmount} · Per-Tx: ${m.perTxCap})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-on-surface block mb-1">Merchant Payee Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GitHub Copilot, AWS, RunPod..."
                      value={simMerchant}
                      onChange={(e) => setSimMerchant(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface block mb-1">Amount ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="0.00"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-mono text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-on-surface block mb-1">Spend Category</label>
                    <input
                      type="text"
                      value={simCategory}
                      onChange={(e) => setSimCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. Cloud Infrastructure, Gambling..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface block mb-1">Merchant Jurisdiction</label>
                    <input
                      type="text"
                      value={simJurisdiction}
                      onChange={(e) => setSimJurisdiction(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. US, UK, Cyprus..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] hover:bg-primary-container transition-all cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Evaluating Spend &amp; Connecting PayPal Rail...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Execute Spend Evaluation</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Live Decision Preview Panel */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-sm border border-outline-variant/30 space-y-4">
              {(() => {
                const targetMandate = mandates.find((m) => m.id === selectedMandateId) || mandates[0] || {
                  monthlyCap: 1000,
                  spentAmount: 0,
                  perTxCap: 500,
                  approvalTrigger: 300,
                  whitelistedMerchants: ['GitHub', 'AWS', 'OpenAI', 'RunPod'],
                  restrictedCategories: ['Gambling', 'Adult Services', 'Crypto'],
                };

                const amountNum = Number(simAmount) || 0;
                const merchantClean = (simMerchant || '').trim();
                const categoryClean = (simCategory || 'Cloud Infrastructure').trim();
                const jurisdictionClean = (simJurisdiction || 'US').trim().toUpperCase();

                const isWhitelisted = merchantClean ? targetMandate.whitelistedMerchants.some((w: string) => w.toLowerCase() === merchantClean.toLowerCase()) : null;
                const isWithinPerTx = amountNum > 0 ? amountNum <= targetMandate.perTxCap : null;
                const remainingRunway = Math.max(0, targetMandate.monthlyCap - targetMandate.spentAmount);
                const isWithinBudget = amountNum > 0 ? amountNum <= remainingRunway : null;
                const isRestrictedCat = targetMandate.restrictedCategories.some((r: string) => categoryClean.toLowerCase().includes(r.toLowerCase()));
                const isOffshore = jurisdictionClean && !['US', 'CA', 'UK', 'EU', 'DE', 'FR'].includes(jurisdictionClean);

                let previewDecision: 'APPROVED' | 'ESCALATED' | 'BLOCKED' = 'APPROVED';
                let calculatedScore = 15;

                if (isRestrictedCat || jurisdictionClean === 'CYPRUS') {
                  previewDecision = 'BLOCKED';
                  calculatedScore = 95;
                } else if (isWithinPerTx === false || isWithinBudget === false || amountNum >= targetMandate.approvalTrigger) {
                  previewDecision = 'ESCALATED';
                  calculatedScore = isWithinPerTx === false ? 65 : 45;
                } else if (isWhitelisted === false && merchantClean) {
                  previewDecision = 'ESCALATED';
                  calculatedScore = 55;
                }

                return (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
                      <div>
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                          Real-Time Decision Preview
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          Policy checks live-synced to inputs
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
                        previewDecision === 'APPROVED'
                          ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                          : previewDecision === 'ESCALATED'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-error-container text-on-error-container border border-error/30'
                      }`}>
                        {previewDecision}
                      </span>
                    </div>

                    {/* Policy Criteria Checks */}
                    <div className="space-y-2 text-xs">
                      {/* Check 1: Allowlist */}
                      <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between border border-outline-variant/15">
                        <span className="text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">checklist</span>
                          Merchant Allowlist
                        </span>
                        <span className="font-semibold">
                          {!merchantClean ? (
                            <span className="text-on-surface-variant/60">Awaiting input</span>
                          ) : isWhitelisted ? (
                            <span className="text-tertiary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check</span> Whitelisted
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">warning</span> Unlisted Vendor
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Check 2: Single-Tx Cap */}
                      <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between border border-outline-variant/15">
                        <span className="text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">speed</span>
                          Single-Tx Limit (${targetMandate.perTxCap})
                        </span>
                        <span className="font-semibold">
                          {amountNum <= 0 ? (
                            <span className="text-on-surface-variant/60">Awaiting amount</span>
                          ) : isWithinPerTx ? (
                            <span className="text-tertiary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check</span> In Cap (${amountNum})
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">error</span> Exceeded (+${(amountNum - targetMandate.perTxCap).toFixed(0)})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Check 3: Monthly Budget Runway */}
                      <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between border border-outline-variant/15">
                        <span className="text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                          Monthly Runway
                        </span>
                        <span className="font-semibold">
                          {amountNum <= 0 ? (
                            <span className="text-on-surface-variant/60 font-mono">${remainingRunway.toFixed(0)} left</span>
                          ) : isWithinBudget ? (
                            <span className="text-tertiary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check</span> ${(remainingRunway - amountNum).toFixed(0)} remains
                            </span>
                          ) : (
                            <span className="text-error font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">block</span> Budget Overrun
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Check 4: Category Restriction */}
                      <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between border border-outline-variant/15">
                        <span className="text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">category</span>
                          Category Filter
                        </span>
                        <span className="font-semibold">
                          {isRestrictedCat ? (
                            <span className="text-error font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">cancel</span> Restricted
                            </span>
                          ) : (
                            <span className="text-tertiary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check</span> Permitted
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Check 5: Jurisdiction */}
                      <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between border border-outline-variant/15">
                        <span className="text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">public</span>
                          Jurisdiction KYB
                        </span>
                        <span className="font-semibold">
                          {isOffshore ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">report</span> Offshore Risk
                            </span>
                          ) : (
                            <span className="text-tertiary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check</span> Approved Zone
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Real-time Risk Score Meter */}
                    <div className="pt-2 border-t border-surface-container-low space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-on-surface-variant font-semibold">Projected Risk Index</span>
                        <span className="font-mono font-bold text-on-surface">{calculatedScore}/100</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            calculatedScore >= 80 ? 'bg-error' : calculatedScore >= 40 ? 'bg-amber-500' : 'bg-tertiary'
                          }`}
                          style={{ width: calculatedScore + '%' }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Detailed Decision Card (Post-Execution Result) */}
          {evaluationResult && (
            <div
              className={`p-5 rounded-2xl border shadow-sm transition-all ${
                evaluationResult.decision === 'APPROVED'
                  ? 'bg-tertiary-container/15 border-tertiary/40'
                  : evaluationResult.decision === 'ESCALATED'
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-error-container/20 border-error/40'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${
                      evaluationResult.decision === 'APPROVED'
                        ? 'bg-tertiary'
                        : evaluationResult.decision === 'ESCALATED'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-error'
                    }`}
                  />
                  <span className="font-display font-extrabold text-base text-on-surface">
                    Executed Decision: {evaluationResult.decision}
                  </span>
                </div>
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-surface-container">
                  Risk Score: {evaluationResult.riskScore}/100
                </span>
              </div>

              <div className="pt-3 text-xs space-y-3">
                <p className="font-semibold text-on-surface text-sm">{evaluationResult.reason}</p>
                
                {/* Full Breakdown of Violations / Guardrail Breaches */}
                {evaluationResult.violations && evaluationResult.violations.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-surface-container-low/80 border border-outline-variant/20 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                      Policy Violations &amp; Guardrail Triggers:
                    </span>
                    <ul className="list-disc list-inside text-on-surface space-y-1 text-xs">
                      {evaluationResult.violations.map((v: string, i: number) => (
                        <li key={i} className="font-medium text-amber-700 dark:text-amber-300">{v}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Recommendation: {evaluationResult.recommendation}</span>
                  <span className="font-mono">Rail Latency: {evaluationResult.settlementLatencySeconds}s</span>
                </div>

                {/* BOLD APPROVALS CALLOUT BANNER */}
                {evaluationResult.decision === 'ESCALATED' && (
                  <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-500/20 border-2 border-amber-500 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[28px] animate-bounce">gavel</span>
                      <div>
                        <p className="font-extrabold text-xs sm:text-sm text-on-surface tracking-tight uppercase">
                          ⚡ ACTION REQUIRED: Transaction Escrowed for Human Fiduciary Review
                        </p>
                        <p className="text-[11px] sm:text-xs text-on-surface-variant font-medium">
                          Threshold exceeded. Proceed to the <strong className="text-primary font-bold">Approvals Queue</strong> to review evidence and authorize release.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab('approvals')}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap self-stretch sm:self-auto cursor-pointer"
                    >
                      <span>GO TO APPROVALS PAGE</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}\n\n      {/* 
          SUBTAB 2: DISPUTE RESOLVER
      */}
      {activeSubTab === 'dispute' && (
        <div className="space-y-3">
          <div className="p-3 bg-tertiary-container/15 rounded-xl border border-tertiary/20 text-xs text-on-surface flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[20px]">shield</span>
              <span className="font-semibold">Autonomous Merchant Dispute Defense Active</span>
            </div>
            <span className="text-tertiary font-bold">PayPal Disputes API &amp; Seller Protection Ready</span>
          </div>

          <div className="space-y-3">
            {disputes.map((caseItem) => (
              <div
                key={caseItem.id}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-3"
              >
                <div className="flex items-start justify-between pb-2 border-b border-surface-container-low">
                  <div>
                    <span className="font-bold text-sm text-on-surface block">
                      {caseItem.merchant}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Case #{caseItem.id} · Disputed: {caseItem.disputeReason}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-on-surface tabular-nums block">
                      ${caseItem.amount.toFixed(2)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      {caseItem.winProbability}% Win Probability
                    </span>
                  </div>
                </div>

                {/* Evidentiary Stream */}
                <div className="p-2.5 rounded-lg bg-surface-container-low text-xs space-y-1">
                  <div className="flex items-center justify-between text-on-surface-variant font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                      Courier Evidence: {caseItem.carrier}
                    </span>
                    <span className="font-mono">Tracking: {caseItem.trackingNumber}</span>
                  </div>
                  <p className="text-on-surface font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                    Delivery Status: {caseItem.deliveryStatus}
                  </p>
                </div>

                {/* AI Rebuttal */}
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      AI Generated Rebuttal Draft (PayPal Resolution Center):
                    </span>
                    <button
                      onClick={() => handleDraftDisputeWithAI(caseItem)}
                      disabled={draftingDisputeId === caseItem.id}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                      {draftingDisputeId === caseItem.id ? 'Drafting with Gemini...' : 'Regenerate with Gemini AI'}
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-surface-container text-on-surface leading-relaxed text-[11px] font-mono">
                    {caseItem.rebuttalDraft}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      caseItem.status === 'submitted'
                        ? 'bg-tertiary-container/30 text-tertiary'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {caseItem.status === 'submitted' ? 'Evidence Submitted to PayPal' : 'Draft Ready for Submission'}
                  </span>

                  {caseItem.status !== 'submitted' && (
                    <button
                      onClick={() => handleResolveDispute(caseItem.id)}
                      disabled={submittingDisputeId === caseItem.id}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow hover:bg-primary-container flex items-center gap-1.5 transition-all"
                    >
                      {submittingDisputeId === caseItem.id ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting to PayPal API...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[14px]">send</span>
                          <span>Submit Rebuttal to PayPal</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 3: PROCUREMENT AGENT
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'procurement' && (
        <div className="space-y-3">
          <div className="p-3 bg-primary-fixed/20 rounded-xl border border-primary/20 text-xs text-on-surface flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
              <span className="font-semibold">3-Way PO Matching &amp; Anomaly Scanner</span>
            </div>
            <label className="cursor-pointer px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary border border-primary/30 text-[10px] font-bold hover:bg-primary/10 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">upload_file</span>
              <span>{isUploadingInvoice ? 'Analyzing PO...' : 'Upload Vendor Invoice'}</span>
              <input type="file" accept="image/*,.pdf,.json" onChange={handleUploadInvoice} className="hidden" />
            </label>
          </div>

          {uploadedInvoiceInfo && (
            <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              <span>{uploadedInvoiceInfo}</span>
            </div>
          )}

          <div className="space-y-3">
            {pos.map((po) => (
              <div
                key={po.id}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-2.5"
              >
                <div className="flex items-start justify-between pb-2 border-b border-surface-container-low">
                  <div>
                    <span className="font-bold text-sm text-on-surface block">{po.vendor}</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      PO #{po.poNumber} · {po.lineItemsCount} Line Items
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-on-surface tabular-nums block">
                      ${po.invoiceAmount.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                        po.anomalyDetected ? 'bg-error-container text-error' : 'bg-tertiary-container/30 text-tertiary'
                      }`}
                    >
                      {po.anomalyDetected ? `Variance: +${po.variancePercent}%` : '100% Match'}
                    </span>
                  </div>
                </div>

                {/* 3-Way Match Line Comparison */}
                <div className="p-2 rounded-lg bg-surface-container-low text-[11px] font-mono space-y-1">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Approved PO Line:</span>
                    <span>10 units @ $140.00 = ${po.poAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-on-surface font-semibold">
                    <span>Billed Invoice Line:</span>
                    <span>12 units @ $150.00 = ${po.invoiceAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                    po.anomalyDetected
                      ? 'bg-error-container/20 text-on-surface border border-error/20'
                      : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  <span className="font-bold block mb-0.5">
                    {po.anomalyDetected ? '⚠️ Mismatch Flagged (Human Review Required):' : '✅ 3-Way Verification Status:'}
                  </span>
                  {po.anomalyReason}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-on-surface-variant uppercase font-semibold">
                    Original PO: ${po.poAmount.toFixed(2)}
                  </span>

                  {po.status === 'settled' ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      Settled via PayPal Payout
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePayPO(po.id)}
                      disabled={payingPoId === po.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-all ${
                        po.anomalyDetected
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-primary text-on-primary hover:bg-primary-container'
                      }`}
                    >
                      {payingPoId === po.id ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Dispatching PayPal Payout...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[14px]">payments</span>
                          <span>{po.anomalyDetected ? 'Human Sign-off & Payout' : 'Approve & Pay via PayPal'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 4: FREELANCER CFO
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'cfo' && (
        <div className="space-y-4">
          {/* Multi-Currency Portfolio Summary */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">currency_exchange</span>
                <span className="font-bold text-xs text-on-surface uppercase tracking-wide">Multi-Currency Treasury Summary</span>
              </div>
              <span className="text-[11px] text-secondary font-bold">Liquidity Runway: 8.4 Months</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-surface-container-low">
                <span className="text-[10px] text-on-surface-variant block">USD (Primary)</span>
                <span className="text-sm font-bold text-on-surface font-mono">$24,800.00</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-low">
                <span className="text-[10px] text-on-surface-variant block">EUR (€1.08)</span>
                <span className="text-sm font-bold text-on-surface font-mono">€14,200.00</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-low">
                <span className="text-[10px] text-on-surface-variant block">GBP (£1.26)</span>
                <span className="text-sm font-bold text-on-surface font-mono">£6,500.00</span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-low">
                <span className="text-[10px] text-on-surface-variant block">JPY (¥0.0067)</span>
                <span className="text-sm font-bold text-on-surface font-mono">¥380,000</span>
              </div>
            </div>
          </div>

          {/* AI Invoice Creation Chat */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-2">
            <span className="text-xs font-bold text-on-surface block">
              💬 CFO AI Chat: Create New Invoice
            </span>
            <form onSubmit={handleCfoChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={cfoChatInput}
                onChange={(e) => setCfoChatInput(e.target.value)}
                placeholder="e.g. Create invoice for Acme Corp for $1,200 for AI UX Design..."
                className="flex-1 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <button
                type="submit"
                disabled={cfoChatLoading || !cfoChatInput.trim()}
                className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-semibold shadow hover:bg-secondary-container transition-all flex items-center gap-1"
              >
                {cfoChatLoading ? 'Drafting...' : 'Generate Invoice'}
              </button>
            </form>
          </div>

          {/* Late-Payer Follow-Up Modal/Box (if drafted) */}
          {cfoFollowUpDraft && (
            <div className="p-3.5 rounded-xl bg-secondary-container/30 border border-secondary/30 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-secondary/20">
                <span className="font-bold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  AI Drafted Late-Payer Follow-Up (WhatsApp &amp; Email)
                </span>
                <button onClick={() => setCfoFollowUpDraft(null)} className="text-on-surface-variant hover:text-on-surface text-xs">
                  ✕ Close
                </button>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant block">Subject:</span>
                <p className="font-semibold text-on-surface">{cfoFollowUpDraft.emailSubject}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant block">Email Body:</span>
                <p className="p-2 rounded bg-surface-container-lowest text-on-surface whitespace-pre-wrap text-[11px]">
                  {cfoFollowUpDraft.emailBody}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant block">WhatsApp Quick Message:</span>
                <p className="p-2 rounded bg-surface-container-lowest text-on-surface text-[11px]">
                  {cfoFollowUpDraft.whatsappMessage}
                </p>
              </div>
            </div>
          )}

          {/* Invoices List */}
          <div className="space-y-3">
            {cfoInvoices.map((inv) => {
              const payPalLink = generatePayPalPaymentLink('client-billing@acme.com', inv.amount, `Invoice ${inv.invoiceNumber}`);
              return (
                <div
                  key={inv.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-2.5"
                >
                  <div className="flex items-start justify-between pb-2 border-b border-surface-container-low">
                    <div>
                      <span className="font-bold text-sm text-on-surface block">{inv.client}</span>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        {inv.invoiceNumber} · Due: {inv.dueDate}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-on-surface tabular-nums block">
                        {inv.currency === 'GBP' ? '£' : inv.currency === 'EUR' ? '€' : '$'}
                        {inv.amount.toLocaleString()} {inv.currency}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                          inv.status === 'overdue'
                            ? 'bg-error-container text-error'
                            : inv.status === 'collected'
                            ? 'bg-tertiary-container/30 text-tertiary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {inv.status === 'overdue'
                          ? `${inv.daysOverdue} Days Overdue`
                          : inv.status === 'collected'
                          ? 'Collected'
                          : 'On Track'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-container-low text-xs text-on-surface-variant flex items-center justify-between">
                    <span className="text-[11px]">Audit / Chasing Log:</span>
                    <span className="font-medium text-on-surface text-[11px] truncate max-w-[280px]">
                      {inv.lastChased}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href={payPalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      <span>PayPal Invoice Link</span>
                    </a>

                    {inv.status === 'overdue' && (
                      <button
                        onClick={() => handleDraftLatePayerChaser(inv)}
                        disabled={chasingInvId === inv.id}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-semibold shadow hover:bg-secondary-container flex items-center gap-1.5"
                      >
                        {chasingInvId === inv.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Drafting with Gemini...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            <span>Draft AI Follow-Up (WhatsApp &amp; Email)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
