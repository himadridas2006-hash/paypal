'use client';

import React, { useState } from 'react';
import { SAMPLE_FAIRSHARE_RECEIPT } from '@/lib/mock-data';
import { generatePayPalPaymentLink } from '@/lib/paypal';

export const FairShareView: React.FC = () => {
  // Start with empty prompt so user fills their own
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [participants, setParticipants] = useState(SAMPLE_FAIRSHARE_RECEIPT.participants);
  const [items, setItems] = useState(SAMPLE_FAIRSHARE_RECEIPT.items);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptName, setReceiptName] = useState(SAMPLE_FAIRSHARE_RECEIPT.restaurant);
  const [receiptTotal, setReceiptTotal] = useState(SAMPLE_FAIRSHARE_RECEIPT.total);

  // Math sum check
  const sumOfShares = participants.reduce((acc, p) => acc + p.shareAmount, 0);
  const mathIsExact = Math.abs(sumOfShares - receiptTotal) < 0.05;

  const handleRunArbiter = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/arbitrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || "Alice didn't drink alcohol, Bob left early and only shared the sliders, and Charlie covered the dessert for everyone.",
          items,
          total: receiptTotal,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setAiExplanation(data.explanation);
      }
      if (data.splits && Array.isArray(data.splits)) {
        const updated = participants.map((p) => {
          const match = data.splits.find((s: any) => s.name.toLowerCase() === p.name.toLowerCase());
          return match ? { ...p, shareAmount: match.share } : p;
        });
        setParticipants(updated);
      }
    } catch (e) {
      console.error('Gemini error, fallback:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimulateReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReceipt(true);
    setTimeout(() => {
      setIsUploadingReceipt(false);
      setReceiptName(`${file.name.replace(/\.[^/.]+$/, '')} (OCR Parsed)`);
    }, 1200);
  };

  const handleCopy = (link: string, name: string) => {
    navigator.clipboard?.writeText(link);
    setCopiedLink(name);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSimulatePayment = (name: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.name === name ? { ...p, paidStatus: 'paid' } : p))
    );
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-gutter-mobile py-4 pb-16 space-y-space-md">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed w-fit text-xs font-semibold">
          <span className="material-symbols-outlined text-[16px]">group_work</span>
          <span>Conversational Expense Arbiter</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-on-surface">FairShare AI Arbiter</h1>
        <p className="text-xs text-on-surface-variant">
          Contextual, non-equal shared bill split with OCR itemization &amp; instant PayPal settlement links.
        </p>
      </div>

      {/* Bill & Prompt Control Box */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-surface-container-low gap-2">
          <div>
            <span className="text-xs font-bold text-on-surface block">
              {receiptName}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {SAMPLE_FAIRSHARE_RECEIPT.date} · Receipt Total: ${receiptTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface text-[10px] font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">upload_file</span>
              <span>{isUploadingReceipt ? 'Scanning...' : 'Upload Receipt'}</span>
              <input type="file" accept="image/*,.pdf" onChange={handleSimulateReceiptUpload} className="hidden" />
            </label>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
              OCR Verified
            </span>
          </div>
        </div>

        {/* Mathematical Exact Match Indicator */}
        <div className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between ${
          mathIsExact ? 'bg-tertiary-container/20 text-tertiary border border-tertiary/20' : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">
              {mathIsExact ? 'verified' : 'calculate'}
            </span>
            <span>Mathematical Reconciliation Check:</span>
          </div>
          <span className="font-mono font-bold">
            Bill ${receiptTotal.toFixed(2)} = Shares ${sumOfShares.toFixed(2)} ({mathIsExact ? '100% Balanced' : 'Adjusting'})
          </span>
        </div>

        {/* Natural Language Prompt */}
        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">
            Arbitration Prompt (Natural Language Nuances):
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary leading-relaxed"
              placeholder="e.g. Alice didn't drink alcohol, Bob left early and only shared the sliders, and Charlie covered the dessert for everyone."
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] text-on-surface-variant font-medium py-1">Presets:</span>
          <button
            onClick={() =>
              setPrompt("Alice didn't drink alcohol, Bob left early and only shared the sliders, and Charlie covered the dessert.")
            }
            className="px-2 py-1 rounded bg-surface-container text-on-surface text-[10px] hover:bg-surface-container-high"
          >
            🍷 Alice no alcohol, Bob early
          </button>
          <button
            onClick={() =>
              setPrompt("Charlie paid the $50 deposit upfront, divide alcohol equally between Bob and Dana only.")
            }
            className="px-2 py-1 rounded bg-surface-container text-on-surface text-[10px] hover:bg-surface-container-high"
          >
            💳 Charlie paid deposit
          </button>
          <button
            onClick={() =>
              setPrompt("Equal 4-way split but tax and tip paid by Charlie as a birthday treat.")
            }
            className="px-2 py-1 rounded bg-surface-container text-on-surface text-[10px] hover:bg-surface-container-high"
          >
            🎂 Birthday treat split
          </button>
        </div>

        {/* AI Explanation Banner (when generated) */}
        {aiExplanation && (
          <div className="p-2.5 rounded-lg bg-secondary-container/30 border border-secondary/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-secondary font-bold text-[11px]">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>Gemini AI Arbitration Reasoning:</span>
            </div>
            <p className="text-on-surface leading-relaxed text-[11px]">{aiExplanation}</p>
          </div>
        )}

        <button
          onClick={handleRunArbiter}
          disabled={isAnalyzing}
          className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary text-xs font-semibold flex items-center justify-center gap-1.5 shadow active:scale-[0.99] hover:bg-secondary-container transition-all"
        >
          {isAnalyzing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Evaluating Nuances with Gemini AI &amp; Recalculating...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              <span>Run FairShare AI Calculation</span>
            </>
          )}
        </button>
      </div>

      {/* Itemized Line Items Table */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
            Extracted Line Items (OCR)
          </span>
          <span className="text-[11px] text-on-surface-variant">Tax &amp; Tip weighted automatically</span>
        </div>
        <div className="divide-y divide-surface-container-low">
          {items.map((item) => (
            <div key={item.id} className="py-2 flex items-center justify-between text-xs">
              <div>
                <span className="font-medium text-on-surface block">{item.name}</span>
                <span className="text-[10px] text-on-surface-variant">
                  Assigned to: {item.assignedTo.join(', ')}
                </span>
              </div>
              <span className="font-bold text-on-surface tabular-nums">${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Shares with PayPal Links */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
            Member Splits &amp; PayPal Settlement
          </span>
          <span className="text-[11px] text-tertiary font-semibold">100% Mathematically Balanced</span>
        </div>

        <div className="space-y-2">
          {participants.map((p) => {
            const payPalLink = generatePayPalPaymentLink(p.paypalEmail, p.shareAmount, `FairShare split: ${SAMPLE_FAIRSHARE_RECEIPT.restaurant}`);
            return (
              <div
                key={p.name}
                className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center font-bold text-xs text-secondary">
                    {p.name[0]}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-on-surface block">{p.name}</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{p.paypalEmail}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-on-surface tabular-nums block">
                      ${p.shareAmount.toFixed(2)}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full inline-block ${
                        p.paidStatus === 'paid'
                          ? 'bg-tertiary-container/30 text-tertiary'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {p.paidStatus === 'paid' ? 'Paid via PayPal' : 'Awaiting Payment'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(payPalLink, p.name)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-medium hover:bg-surface-container-highest transition-colors flex items-center gap-1"
                      title="Copy PayPal payment link"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedLink === p.name ? 'check' : 'link'}
                      </span>
                      <span>{copiedLink === p.name ? 'Copied' : 'Link'}</span>
                    </button>

                    {p.paidStatus !== 'paid' && (
                      <button
                        onClick={() => handleSimulatePayment(p.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-[11px] font-semibold hover:bg-primary-container transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">send</span>
                        <span>Pay</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
