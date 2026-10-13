import React from 'react';
import { AgentMandate, TransactionActivity, EscalatedApproval, ViewTab, ToolSubTab } from '@/types';

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
  const activeMandates = mandates.filter((m) => m.status === 'active').length;
  const totalCap = mandates.reduce((acc, m) => acc + (m.monthlyCap || 0), 0);
  const totalSpent = mandates.reduce((acc, m) => acc + (m.spentAmount || 0), 0);
  const utilization = totalCap > 0 ? Math.round((totalSpent / totalCap) * 100) : 0;

  const recentTxs = transactions.slice(0, 4);

  return (
    <aside className="w-full xl:w-80 2xl:w-88 shrink-0 space-y-4">
      {/* Live System Guard Status */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Autonomous Fiduciary Status
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-surface text-[10px] font-mono font-bold">
            PayPal Sandbox
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span className="text-[10px] text-on-surface-variant font-medium block">Active Agents</span>
            <span className="text-base font-extrabold text-on-surface font-mono">{activeMandates} / {mandates.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span className="text-[10px] text-on-surface-variant font-medium block">Utilization</span>
            <span className="text-base font-extrabold text-on-surface font-mono">{utilization}%</span>
          </div>
        </div>

        {/* Policy Shield Indicators */}
        <div className="space-y-1.5 pt-1 text-[11px]">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-tertiary">verified_user</span>
              Pre-Auth Gate:
            </span>
            <span className="font-semibold text-tertiary">Active (100%)</span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">speed</span>
              Escalations Queue:
            </span>
            <span className="font-semibold text-on-surface">{pendingApprovalsCount} pending</span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-secondary">shield</span>
              Merchant Whitelist:
            </span>
            <span className="font-semibold text-on-surface">Zero Leakage</span>
          </div>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
          Quick Workflows
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onNavigateTab('mandates')}
            className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all text-xs font-medium text-on-surface flex flex-col gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
            <span className="font-semibold text-[11px]">New Mandate</span>
          </button>

          <button
            onClick={() => {
              if (onNavigateTool) onNavigateTool('simulator');
              onNavigateTab('tools');
            }}
            className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all text-xs font-medium text-on-surface flex flex-col gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">bolt</span>
            <span className="font-semibold text-[11px]">Spend Firewall</span>
          </button>

          <button
            onClick={() => onNavigateTab('fairshare')}
            className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all text-xs font-medium text-on-surface flex flex-col gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary">receipt_long</span>
            <span className="font-semibold text-[11px]">Split Bill</span>
          </button>

          <button
            onClick={() => onNavigateTab('approvals')}
            className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-left border border-outline-variant/20 transition-all text-xs font-medium text-on-surface flex flex-col gap-1 active:scale-95 relative"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-500">gavel</span>
            <span className="font-semibold text-[11px]">Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error" />
            )}
          </button>
        </div>

        {onLoadDemoData && (
          <button
            onClick={onLoadDemoData}
            className="w-full mt-1 py-2 px-3 rounded-xl bg-secondary-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold border border-outline-variant/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">dataset</span>
            <span>Load Demo Sandbox Scenario</span>
          </button>
        )}
      </div>

      {/* Mini Live Activity Stream */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Live Stream
          </h4>
          <button
            onClick={() => onNavigateTab('command')}
            className="text-[10px] text-primary font-semibold hover:underline"
          >
            View All
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="py-4 text-center text-on-surface-variant/70 text-xs">
            <span className="material-symbols-outlined text-xl mb-1 block">history</span>
            No recent transaction events
          </div>
        ) : (
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-container-low text-xs border border-outline-variant/20"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface text-[11px] truncate">{tx.merchant}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{tx.timestamp}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-[11px] text-on-surface block">
                    ${tx.amount.toFixed(2)}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      tx.status === 'approved'
                        ? 'text-tertiary bg-tertiary/10'
                        : tx.status === 'blocked'
                        ? 'text-error bg-error/10'
                        : 'text-amber-500 bg-amber-500/10'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
