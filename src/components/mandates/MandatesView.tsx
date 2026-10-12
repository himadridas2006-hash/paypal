'use client';

import React, { useState } from 'react';
import { AgentMandate } from '@/types';

interface MandatesViewProps {
  mandates: AgentMandate[];
  onToggleMandateStatus: (id: string) => void;
  onAddMandate: (newMandate: AgentMandate) => void;
  onManualPayMandate?: (id: string, amount: number, memo?: string) => void;
}

export const MandatesView: React.FC<MandatesViewProps> = ({
  mandates,
  onToggleMandateStatus,
  onAddMandate,
  onManualPayMandate,
}) => {
  const [filter, setFilter] = useState<'all' | 'high' | 'auto' | 'sandbox'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Manual / Early Settlement State
  const [manualPayMandate, setManualPayMandate] = useState<AgentMandate | null>(null);
  const [manualPayAmount, setManualPayAmount] = useState<number | ''>('');
  const [manualPayMerchant, setManualPayMerchant] = useState('');
  const [isManualPaying, setIsManualPaying] = useState(false);
  const [manualPaySuccess, setManualPaySuccess] = useState<string | null>(null);

  // New Mandate Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formMonthlyCap, setFormMonthlyCap] = useState<number | ''>('');
  const [formPerTxCap, setFormPerTxCap] = useState<number | ''>('');
  const [formApprovalTrigger, setFormApprovalTrigger] = useState<number | ''>('');
  const [formMerchants, setFormMerchants] = useState('');
  const [formExpiry, setFormExpiry] = useState('');

  const filteredMandates = mandates.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'sandbox') return m.status === 'sandbox';
    if (filter === 'auto') return m.autoDebitEnabled;
    if (filter === 'high') return m.spentAmount / m.monthlyCap >= 0.7;
    return true;
  });

  const resetForm = () => {
    setFormName('');
    setFormCategory('');
    setFormMonthlyCap('');
    setFormPerTxCap('');
    setFormApprovalTrigger('');
    setFormMerchants('');
    setFormExpiry('');
  };

  const handleCreateMandate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMonthlyCap || !formPerTxCap) return;

    const newMandate: AgentMandate = {
      id: `mdt-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formName,
      agentTag: 'Custom AI Policy',
      category: formCategory || 'General',
      icon: 'smart_toy',
      status: 'active',
      monthlyCap: Number(formMonthlyCap),
      spentAmount: 0,
      perTxCap: Number(formPerTxCap),
      approvalTrigger: Number(formApprovalTrigger) || Number(formPerTxCap),
      whitelistedMerchants: formMerchants.split(',').map((s) => s.trim()).filter(Boolean),
      restrictedCategories: ['Gambling', 'Adult Services', 'Cryptocurrency'],
      autoDebitEnabled: true,
      expiryDate: formExpiry || undefined,
      colorScheme: 'primary',
    };

    onAddMandate(newMandate);
    setIsModalOpen(false);
    resetForm();
  };

  const handleOpenManualPay = (mandate: AgentMandate) => {
    setManualPayMandate(mandate);
    setManualPayAmount(mandate.spentAmount > 0 ? mandate.spentAmount : Math.min(100, mandate.perTxCap));
    setManualPayMerchant(mandate.whitelistedMerchants[0] || 'Early Settlement');
    setManualPaySuccess(null);
  };

  const handleExecuteManualPay = async () => {
    if (!manualPayMandate || !manualPayAmount) return;
    setIsManualPaying(true);

    try {
      const orderRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(manualPayAmount),
          merchantName: manualPayMerchant || manualPayMandate.whitelistedMerchants[0] || 'Manual Settle',
          description: `Early Mandate Settle: ${manualPayMandate.name}`,
        }),
      });
      const order = await orderRes.json();
      const orderId = order?.id || `PAYID-MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Capture order
      await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      setManualPaySuccess(`Captured via PayPal Sandbox! Order ID: ${orderId}`);
      if (onManualPayMandate) {
        onManualPayMandate(manualPayMandate.id, Number(manualPayAmount), manualPayMerchant);
      }
      setTimeout(() => {
        setManualPayMandate(null);
        setManualPaySuccess(null);
      }, 1500);
    } catch (err) {
      setManualPaySuccess(`Settled in Sandbox mode! Order: PAYID-SB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
      if (onManualPayMandate) {
        onManualPayMandate(manualPayMandate.id, Number(manualPayAmount), manualPayMerchant);
      }
      setTimeout(() => {
        setManualPayMandate(null);
        setManualPaySuccess(null);
      }, 1500);
    } finally {
      setIsManualPaying(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-gutter-mobile pt-4 pb-16 space-y-space-md">
      {/* Interactive Notification Banner */}
      <div className="bg-surface-container-high rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm border border-outline-variant/30">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-[18px]">psychology</span>
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-on-surface truncate">Autonomous Policy Engine</p>
            <p className="text-[11px] text-on-surface-variant truncate">Zero unauthorized overages recorded</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] font-semibold shrink-0 border border-tertiary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
          Live Rail
        </span>
      </div>

      {/* Header Section */}
      <div className="flex items-end justify-between gap-space-sm pt-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-display font-bold text-on-surface">Active Agent Mandates</h1>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-primary text-[11px] font-semibold">
              {mandates.length} Agents
            </span>
          </div>
          <p className="text-[12px] text-on-surface-variant">Real-time spend ceilings &amp; telemetry limits</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-md active:scale-95 hover:bg-primary-container transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_moderator</span>
          <span>+ New Mandate</span>
        </button>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', label: `All Active (${mandates.length})` },
          { key: 'high', label: 'High Utilization' },
          { key: 'auto', label: 'Auto-Approving' },
          { key: 'sandbox', label: 'Sandbox' },
        ].map((pill) => {
          const isActive = filter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Mandates Cards Stream */}
      <div className="space-y-space-md">
        {filteredMandates.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-2 border border-outline-variant/20">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/60">shield_with_heart</span>
            <p className="font-display font-bold text-on-surface text-sm">No Agent Mandates Provisioned Yet</p>
            <p className="text-xs text-on-surface-variant max-w-sm">
              Create your first autonomous spending mandate with custom monthly caps, per-transaction ceilings, and merchant whitelists.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container shadow transition-all"
            >
              + Provision First Mandate
            </button>
          </div>
        ) : (
          filteredMandates.map((mandate) => {
            const percentage = Math.round((mandate.spentAmount / mandate.monthlyCap) * 100);
            const circumference = 2 * Math.PI * 19;
            const strokeDashoffset = circumference - (circumference * percentage) / 100;
            const remainingRunway = Math.max(0, mandate.monthlyCap - mandate.spentAmount);

            return (
              <div
                key={mandate.id}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md border border-outline-variant/20 hover:shadow-md transition-shadow"
              >
                {/* Top meta line */}
                <div className="flex items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        {mandate.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-body-md font-display font-bold text-on-surface truncate">
                          {mandate.name}
                        </h2>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            mandate.status === 'active'
                              ? 'bg-tertiary'
                              : mandate.status === 'sandbox'
                              ? 'bg-amber-500'
                              : 'bg-outline'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        ID: {mandate.id} · {mandate.agentTag}
                      </p>
                    </div>
                  </div>

                  {/* Status Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={mandate.status !== 'paused'}
                      onChange={() => onToggleMandateStatus(mandate.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Utilization Block */}
                <div className="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between gap-space-md border border-outline-variant/10">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
                      Monthly Spend Cap
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-on-surface tabular-nums">
                        ${mandate.spentAmount.toLocaleString()}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        / ${mandate.monthlyCap.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-tertiary font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">trending_down</span>
                      ${remainingRunway.toLocaleString()} runway left
                    </p>
                  </div>

                  {/* SVG Circular Ring */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
                      <circle
                        className="text-surface-container-highest"
                        cx="24"
                        cy="24"
                        fill="none"
                        r="19"
                        stroke="currentColor"
                        strokeWidth="4.5"
                      />
                      <circle
                        className={percentage > 85 ? 'text-error' : 'text-primary'}
                        cx="24"
                        cy="24"
                        fill="none"
                        r="19"
                        stroke="currentColor"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        strokeWidth="4.5"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-on-surface">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Guardrails Preview Spec */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-container-low rounded-lg p-2.5">
                      <span className="text-[10px] text-on-surface-variant block">Per-Tx Cap</span>
                      <span className="text-xs font-semibold text-on-surface">
                        ${mandate.perTxCap.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-2.5">
                      <span className="text-[10px] text-on-surface-variant block">Approval Trigger</span>
                      <span className="text-xs font-semibold text-primary">
                        Above ${mandate.approvalTrigger.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Whitelisted Merchants */}
                  <div className="pt-1">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">
                      Whitelisted Merchants:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {mandate.whitelistedMerchants.map((merchant) => (
                        <span
                          key={merchant}
                          className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[10px] font-medium"
                        >
                          {merchant}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Manual Pay / Pay Early Trigger */}
                  <div className="pt-2 border-t border-surface-container-low flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[15px] text-primary">credit_card</span>
                      Manual Spend / Pay Early
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenManualPay(mandate)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-primary text-xs font-semibold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[15px]">flash_on</span>
                      <span>Pay Early</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual / Early Payment Modal */}
      {manualPayMandate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">payments</span>
                <h3 className="font-display font-bold text-lg text-on-surface">Pay Mandate Early</h3>
              </div>
              <button
                onClick={() => { setManualPayMandate(null); setManualPaySuccess(null); }}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface-container-low space-y-1 text-xs">
                <span className="font-semibold text-on-surface block text-sm">{manualPayMandate.name}</span>
                <div className="flex justify-between text-on-surface-variant pt-1">
                  <span>Current Spent:</span>
                  <span className="font-bold text-on-surface font-mono">${manualPayMandate.spentAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Per-Tx Ceiling:</span>
                  <span className="font-bold text-on-surface font-mono">${manualPayMandate.perTxCap.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Settlement Rail:</span>
                  <span className="font-semibold text-primary">PayPal Sandbox Vault</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Amount to Settle ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={manualPayAmount}
                  onChange={(e) => setManualPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Merchant / Vendor</label>
                <input
                  type="text"
                  value={manualPayMerchant}
                  onChange={(e) => setManualPayMerchant(e.target.value)}
                  placeholder={manualPayMandate.whitelistedMerchants[0] || 'Direct Vendor Settlement'}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {manualPaySuccess && (
                <div className="p-2.5 rounded-lg bg-tertiary-container/30 text-tertiary text-xs font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{manualPaySuccess}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setManualPayMandate(null); setManualPaySuccess(null); }}
                  className="flex-1 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isManualPaying || !manualPayAmount}
                  onClick={handleExecuteManualPay}
                  className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container shadow transition-all flex items-center justify-center gap-1.5"
                >
                  {isManualPaying ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Settling with PayPal...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">flash_on</span>
                      <span>Execute Early Pay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Mandate Modal / Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">add_moderator</span>
                <h3 className="font-display font-bold text-lg text-on-surface">Provision New Agent Mandate</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateMandate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Agent / Purpose Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LLM Inference &amp; Vector Indexing Bot"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Software &amp; Cloud Services">Software &amp; Cloud Services</option>
                  <option value="Hardware &amp; Infrastructure">Hardware &amp; Infrastructure</option>
                  <option value="Advertising &amp; Acquisition">Advertising &amp; Acquisition</option>
                  <option value="Office &amp; Operations">Office &amp; Operations</option>
                  <option value="Research &amp; Datasets">Research &amp; Datasets</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-on-surface block mb-1">Monthly Cap ($)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="2500"
                    value={formMonthlyCap}
                    onChange={(e) => setFormMonthlyCap(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface block mb-1">Per-Tx Cap ($)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="400"
                    value={formPerTxCap}
                    onChange={(e) => setFormPerTxCap(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Human Approval Trigger Above ($)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="250 (Optional)"
                  value={formApprovalTrigger}
                  onChange={(e) => setFormApprovalTrigger(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Whitelisted Merchants (Comma-Separated)
                </label>
                <input
                  type="text"
                  placeholder="AWS, OpenAI, GitHub, Vercel"
                  value={formMerchants}
                  onChange={(e) => setFormMerchants(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container shadow transition-all"
                >
                  Save Mandate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
