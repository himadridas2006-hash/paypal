'use client';

import React, { useState } from 'react';
import { AgentMandate } from '@/types';

export const AgentMarketplaceTab: React.FC<{ mandates: AgentMandate[] }> = ({ mandates }) => {
  const [selectedService, setSelectedService] = useState('High-Throughput Web Scraping Cluster (10M requests)');
  const [targetPrice, setTargetPrice] = useState(250);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationResult, setNegotiationResult] = useState<any>(null);

  const buyerMandate = mandates[0] || {
    name: 'Enterprise Cloud Agent',
    perTxCap: 400,
    monthlyCap: 1500,
  };

  const handleNegotiate = async () => {
    setIsNegotiating(true);
    setNegotiationResult(null);

    try {
      const res = await fetch('/api/v2/marketplace/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerMandate,
          sellerService: selectedService,
          targetPrice,
        }),
      });

      const data = await res.json();
      setNegotiationResult(data);
    } catch (e) {
      console.warn('Negotiation error:', e);
    } finally {
      setIsNegotiating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[24px]">storefront</span>
          <h3 className="text-base font-bold text-on-surface">Agent-to-Agent Autonomous Marketplace</h3>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
            A2A Commerce Rail
          </span>
        </div>
        <p className="text-xs text-on-surface-variant">
          Watch two autonomous AI agents negotiate service pricing in real-time, bound by their respective Mandate guardrails, settling instantly over PayPal Sandbox.
        </p>
      </div>

      {/* Split Screen Agents Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Buyer Agent Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-primary/30 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-primary/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-on-surface">Buyer Agent: Procurement AI</h4>
                  <span className="text-[10px] text-on-surface-variant font-mono">Bound to {buyerMandate.name}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-mono">
                Cap: ${buyerMandate.perTxCap}
              </span>
            </div>

            <div className="text-xs text-on-surface-variant space-y-1">
              <div>Objective: Procure compute resources at lowest rate within policy cap.</div>
              <div>Max Single-Tx Cap: <strong className="text-on-surface font-mono">${buyerMandate.perTxCap}.00 USD</strong></div>
              <div>Mandate Budget Status: <span className="text-tertiary font-bold">Compliant &amp; Active</span></div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low font-mono text-[11px] text-on-surface">
            Policy Rule: Refuse any counter-offer exceeding ${buyerMandate.perTxCap}.
          </div>
        </div>

        {/* Seller Agent Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-secondary/30 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-secondary/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[18px]">dns</span>
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-on-surface">Seller Agent: Infrastructure Provider</h4>
                  <span className="text-[10px] text-on-surface-variant font-mono">Autonomous Merchant API</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold font-mono">
                Ask: ${Math.round(targetPrice * 1.25)}
              </span>
            </div>

            <div className="text-xs text-on-surface-variant space-y-1">
              <div>Service Offering: <strong className="text-on-surface">{selectedService}</strong></div>
              <div>Base Price: <strong className="text-on-surface font-mono">${targetPrice}.00 USD</strong></div>
              <div>Payment Rail: <span className="text-secondary font-bold">PayPal Commercial Sandbox</span></div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low font-mono text-[11px] text-on-surface">
            Merchant Policy: Optimize margin while closing SLA contract in &lt; 3 rounds.
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <label className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">Target Service:</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="High-Throughput Web Scraping Cluster (10M requests)">Web Scraping Cluster (10M reqs)</option>
            <option value="Dedicated Fine-Tuning Llama-3 Node (12 Hours)">Fine-Tuning Llama-3 Node (12 Hrs)</option>
            <option value="Global CDN Edge Cache Provisioning (1TB)">Global CDN Edge Cache (1TB)</option>
          </select>
        </div>

        <button
          onClick={handleNegotiate}
          disabled={isNegotiating}
          className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-primary-container disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isNegotiating ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Agents Negotiating Terms...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">handshake</span>
              <span>Initiate Autonomous Negotiation</span>
            </>
          )}
        </button>
      </div>

      {/* Negotiation Stream & Settlement Results */}
      {negotiationResult && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-[20px]">task_alt</span>
                Consensus Reached: Contract Signed within Mandate Limits
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5">{negotiationResult.result.settlementNote}</p>
            </div>

            <div className="text-right font-mono">
              <span className="text-xs text-on-surface-variant block">Settlement Price</span>
              <span className="text-2xl font-black text-tertiary tabular-nums">
                ${negotiationResult.result.agreedPrice}.00 USD
              </span>
            </div>
          </div>

          {/* Rounds Log */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
              Negotiation Transcript:
            </span>
            {negotiationResult.result.rounds.map((r: any) => (
              <div
                key={r.round}
                className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-start gap-3 text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {r.round}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-primary font-bold">Buyer: ${r.buyerOffer}</span>
                    <span className="text-secondary font-bold">Seller: ${r.sellerCounter}</span>
                  </div>
                  <p className="text-on-surface text-xs leading-relaxed">{r.dialogue}</p>
                </div>
              </div>
            ))}
          </div>

          {/* PayPal Settlement Receipt */}
          <div className="p-3.5 rounded-xl bg-tertiary/10 border border-tertiary/30 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-tertiary font-bold">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>PayPal Sandbox Order Captured</span>
            </div>
            <div className="text-on-surface">{negotiationResult.paypalOrderId}</div>
          </div>
        </div>
      )}
    </div>
  );
};
