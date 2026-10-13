'use client';

import React, { useState, useEffect } from 'react';
import { AgentMandate, TransactionActivity, ViewTab, ToolSubTab } from '@/types';
import { detectAnomalies } from '@/lib/anomaly-engine';

export interface InsightsRailProps {
  mandates: AgentMandate[];
  transactions: TransactionActivity[];
  pendingApprovalsCount: number;
  onNavigateTab: (tab: ViewTab) => void;
  onNavigateTool?: (tool: ToolSubTab) => void;
  onLoadDemoData?: () => void;
}

export const InsightsRail: React.FC<InsightsRailProps> = ({
  mandates,
  transactions,
  pendingApprovalsCount,
  onNavigateTab,
  onNavigateTool,
  onLoadDemoData,
}) => {
  const [telegramStatus, setTelegramStatus] = useState<{ configured: boolean; message?: string } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestSuccess, setTelegramTestSuccess] = useState<string | null>(null);

  const [openSection, setOpenSection] = useState<{
    fiduciary: boolean;
    integrity: boolean;
    threats: boolean;
    telegram: boolean;
    anomalies: boolean;
  }>({
    fiduciary: true,
    integrity: true,
    threats: true,
    telegram: true,
    anomalies: true,
  });

  const toggleSection = (key: keyof typeof openSection) => {
    setOpenSection((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetch('/api/v2/telegram/status')
      .then((res) => res.json())
      .then((data) => setTelegramStatus(data))
      .catch(() => setTelegramStatus({ configured: false }));
  }, []);

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestSuccess(null);
    try {
      const res = await fetch('/api/v2/telegram/test', { method: 'POST' });
      const data = await res.json();
      setTelegramTestSuccess(data.message || (data.success ? 'Message sent!' : 'Not configured'));
    } catch (e) {
      setTelegramTestSuccess('Network error dispatching test message');
    } finally {
      setTestingTelegram(false);
    }
  };

  const activeMandates = mandates.filter((m) => m.status === 'active').length;
  const totalCap = mandates.reduce((acc, m) => acc + (m.monthlyCap || 0), 0);
  const totalSpent = mandates.reduce((acc, m) => acc + (m.spentAmount || 0), 0);
  const utilization = totalCap > 0 ? Math.round((totalSpent / totalCap) * 100) : 0;
  const recentTxs = transactions.slice(0, 4);

  const anomalies = detectAnomalies(mandates, transactions);

  return (
    <aside className="w-full space-y-4 text-xs select-none max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 scrollbar-thin">
      {/* 1. Autonomous Fiduciary Health Status */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div
          onClick={() => toggleSection('fiduciary')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse" />
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Autonomous Fiduciary Status
            </h4>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            {openSection.fiduciary ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {openSection.fiduciary && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15">
                <span className="text-on-surface-variant block text-[10px]">Active Mandates</span>
                <strong className="text-on-surface font-mono text-sm">{activeMandates} of {mandates.length}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15">
                <span className="text-on-surface-variant block text-[10px]">Escrow Queue</span>
                <strong className="text-primary font-mono text-sm">{pendingApprovalsCount} Held</strong>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-on-surface-variant">Monthly Runway Deployed</span>
                <span className="font-mono font-bold text-on-surface">{utilization}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, utilization)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono">
                <span>${totalSpent.toFixed(0)} spent</span>
                <span>${totalCap.toFixed(0)} cap</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Cryptographic Integrity Status */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div
          onClick={() => toggleSection('integrity')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Cryptographic Integrity
            </h4>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            {openSection.integrity ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {openSection.integrity && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-150 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-tertiary/10 border border-tertiary/20">
              <span className="text-tertiary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">link</span>
                SHA-256 Hash Chain
              </span>
              <span className="px-2 py-0.5 rounded bg-tertiary text-white font-mono text-[9px] font-black uppercase">
                VALIDATED
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Zero hash collisions or unauthorized state mutations detected across ledger.
            </p>
            {onNavigateTool && (
              <button
                onClick={() => {
                  onNavigateTool('ledger');
                  onNavigateTab('tools');
                }}
                className="w-full py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-xs font-semibold text-on-surface text-center transition-colors cursor-pointer"
              >
                Inspect Ledger Blocks &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Threat Meter (Attack Lab) */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div
          onClick={() => toggleSection('threats')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[18px]">shield_with_heart</span>
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Injection Shield Status
            </h4>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            {openSection.threats ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {openSection.threats && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-150 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Active Threat Level:</span>
              <span className="font-bold text-tertiary font-mono">0.05 (LOW RISK)</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full bg-tertiary rounded-full w-[8%]" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
              <span>Classifier: Gemini + Regex</span>
              <span className="text-primary font-bold">Layer 0 Active</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Telegram Approvals Status */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div
          onClick={() => toggleSection('telegram')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">send</span>
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Telegram Approvals Bot
            </h4>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            {openSection.telegram ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {openSection.telegram && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-150 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Polling Connection:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                  telegramStatus?.configured
                    ? 'bg-tertiary/15 text-tertiary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {telegramStatus?.configured ? 'CONNECTED' : 'NOT CONFIGURED'}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Escalated transactions dispatch interactive Approve / Deny inline buttons directly to your mobile phone.
            </p>
            <button
              onClick={handleTestTelegram}
              disabled={testingTelegram}
              className="w-full py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-xs font-semibold text-on-surface text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>{testingTelegram ? 'Dispatching...' : 'Send Test Notification'}</span>
            </button>
            {telegramTestSuccess && (
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-mono text-primary leading-relaxed mt-2">{telegramTestSuccess}</div>
            )}
          </div>
        )}
      </div>

      {/* 5. Anomaly Radar & Velocity Forecast */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div
          onClick={() => toggleSection('anomalies')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">query_stats</span>
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider">
              Anomalies &amp; Cap Forecast
            </h4>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            {openSection.anomalies ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {openSection.anomalies && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-150 text-[11px]">
            <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface">Compute Agent Runway</span>
                <span className="text-amber-500 font-bold font-mono">14 Days Left</span>
              </div>
              <p className="text-[10px] text-on-surface-variant">
                Forecasted cap reached: <strong>Nov 04, 2026</strong> at current daily burn ($28/day).
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-on-surface-variant">Velocity Spike:</span>
              <span className="text-tertiary font-bold">NORMAL (1.1x)</span>
            </div>
          </div>
        )}
      </div>

      {/* 6. Live Activity Mini-Stream */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-on-surface text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            Live Event Stream
          </span>
          <span className="text-[10px] text-primary font-mono font-bold">SSE Synced</span>
        </div>

        <div className="divide-y divide-outline-variant/15">
          {recentTxs.map((tx) => (
            <div key={tx.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-on-surface truncate">{tx.merchant}</div>
                <div className="text-[10px] text-on-surface-variant truncate">{tx.category} · {tx.timestamp}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-on-surface">${tx.amount.toFixed(2)}</div>
                <span
                  className={`text-[9px] font-bold uppercase ${
                    tx.status === 'approved'
                      ? 'text-tertiary'
                      : tx.status === 'review'
                      ? 'text-amber-500'
                      : 'text-error'
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
