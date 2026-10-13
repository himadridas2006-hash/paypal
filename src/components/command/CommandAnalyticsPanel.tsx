import React from 'react';
import { DonutChart } from '@/components/common/DonutChart';
import { Sparkline } from '@/components/common/StatTile';
import { ViewTab, ToolSubTab } from '@/types';

export interface CommandAnalyticsPanelProps {
  totalSpent: number;
  totalPool: number;
  approvedCount: number;
  blockedCount: number;
  pendingCount: number;
  sparklineHistory: number[];
  mandatesCount: number;
  onNavigateTab: (tab: ViewTab) => void;
  onNavigateTool?: (tool: ToolSubTab) => void;
}

export const CommandAnalyticsPanel: React.FC<CommandAnalyticsPanelProps> = ({
  totalSpent,
  totalPool,
  approvedCount,
  blockedCount,
  pendingCount,
  sparklineHistory,
  mandatesCount,
  onNavigateTab,
  onNavigateTool,
}) => {
  const totalDecisions = approvedCount + blockedCount + pendingCount || 1;
  const approvedPct = Math.round((approvedCount / totalDecisions) * 100);
  const blockedPct = Math.round((blockedCount / totalDecisions) * 100);
  const pendingPct = 100 - approvedPct - blockedPct;

  const utilizationPct = totalPool > 0 ? Math.min(100, Math.round((totalSpent / totalPool) * 100)) : 0;
  const remainingBudget = Math.max(0, totalPool - totalSpent);

  const donutSegments = [
    { label: 'Utilized', value: totalSpent > 0 ? totalSpent : 1, color: 'var(--color-primary)' },
    { label: 'Remaining', value: remainingBudget > 0 ? remainingBudget : 0, color: 'var(--color-surface-container-high)' },
  ];

  // Checklist state
  const checklist = [
    { id: 'mandate', label: 'Create an Agent Mandate', done: mandatesCount > 0, tab: 'mandates' as ViewTab },
    { id: 'simulate', label: 'Simulate a Payment Event', done: approvedCount + blockedCount > 0, tab: 'tools' as ViewTab, tool: 'simulator' as ToolSubTab },
    { id: 'approve', label: 'Review or Check Escalations', done: pendingCount === 0 || approvedCount > 0, tab: 'approvals' as ViewTab },
    { id: 'split', label: 'Split a Multi-Bill in FairShare', done: true, tab: 'fairshare' as ViewTab },
  ];
  const completedSteps = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-4">
      {/* ─── 7-DAY SPARKLINE & UTILIZATION DONUT CARD ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
              7-Day Spend Velocity & Pool Utilization
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Live trend across autonomous agent settlements
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-surface text-[10px] font-mono font-bold">
            PayPal Commercial
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Sparkline & Trend */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  7-Day Velocity
                </span>
                <span className="text-xl md:text-2xl font-extrabold text-on-surface font-mono">
                  ${totalSpent.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] font-bold text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-full">
                Live Spark
              </span>
            </div>

            <div className="w-full h-12 flex items-center justify-center pt-1">
              <Sparkline data={sparklineHistory} height={42} width={260} accent="primary" />
            </div>

            <div className="flex items-center justify-between text-[10px] text-on-surface-variant/80 pt-1 border-t border-outline-variant/20">
              <span>Day -6</span>
              <span>Day -3</span>
              <span className="font-bold text-on-surface">Today</span>
            </div>
          </div>

          {/* Utilization Donut */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                Pool Utilization
              </span>
              <div className="text-lg md:text-xl font-extrabold text-on-surface font-mono truncate">
                ${totalSpent.toFixed(0)} / ${totalPool > 0 ? totalPool.toFixed(0) : '500'}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                {utilizationPct}% of authorized runway allocated
              </p>
            </div>

            <div className="shrink-0">
              <DonutChart
                segments={donutSegments}
                size={96}
                strokeWidth={12}
                centerValue={`${utilizationPct}%`}
                centerLabel="Runway"
              />
            </div>
          </div>
        </div>

        {/* Decisions Bar (Approved / Escalated / Blocked) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-on-surface">Policy Decisions Breakdown</span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-tertiary">● {approvedCount} Cleared ({approvedPct}%)</span>
              <span className="text-amber-500">● {pendingCount} Review ({pendingPct}%)</span>
              <span className="text-error">● {blockedCount} Blocked ({blockedPct}%)</span>
            </div>
          </div>

          {/* Stacked decision bar */}
          <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${Math.max(approvedCount > 0 ? 5 : 0, approvedPct)}%` }}
              className="bg-tertiary transition-all duration-500"
              title={`Approved: ${approvedCount}`}
            />
            <div
              style={{ width: `${Math.max(pendingCount > 0 ? 5 : 0, pendingPct)}%` }}
              className="bg-amber-400 transition-all duration-500"
              title={`Pending Review: ${pendingCount}`}
            />
            <div
              style={{ width: `${Math.max(blockedCount > 0 ? 5 : 0, blockedPct)}%` }}
              className="bg-error transition-all duration-500"
              title={`Blocked: ${blockedCount}`}
            />
          </div>
        </div>
      </div>

      {/* ─── GET STARTED CHECKLIST CARD ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">checklist</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Fiduciary Onboarding Progress
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-on-surface">
            {completedSteps} / {checklist.length} Complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedSteps / checklist.length) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {checklist.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigateTab(item.tab);
                if (item.tool && onNavigateTool) onNavigateTool(item.tool);
              }}
              className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 text-left transition-all flex items-center justify-between gap-2 group active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                    item.done
                      ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                      : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                  }`}
                >
                  {item.done ? '✓' : '•'}
                </span>
                <span
                  className={`text-xs font-medium truncate ${
                    item.done ? 'text-on-surface font-semibold' : 'text-on-surface-variant'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                arrow_forward
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3-STEP "HOW MANDATE WORKS" STRIP ─── */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">lightbulb</span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
            How Mandate Protects Capital
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-on-surface text-[11px]">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>
              <span>Autonomous Mandate</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Define strict per-transaction caps, monthly budgets, and whitelist merchant domains.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-on-surface text-[11px]">
              <span className="w-4 h-4 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-[10px]">2</span>
              <span>Spend Firewall Gate</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Every card or API charge is verified in 240ms against policy rules before PayPal authorization.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-on-surface text-[11px]">
              <span className="w-4 h-4 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center text-[10px]">3</span>
              <span>Human Review Escrow</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Anomalies or cap breaches are held in escrow for 1-click authorization via PayPal Sandbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
