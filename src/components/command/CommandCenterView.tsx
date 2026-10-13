'use client';

import React, { useState } from 'react';
import { TransactionActivity, ViewTab, ToolSubTab, AgentMandate } from '@/types';
import { CommandAnalyticsPanel } from './CommandAnalyticsPanel';

interface CommandCenterViewProps {
  mandates?: AgentMandate[];
  transactions: TransactionActivity[];
  pendingCount: number;
  onNavigateTab: (tab: ViewTab) => void;
  onNavigateTool?: (tool: ToolSubTab) => void;
  onOpenSimulator: () => void;
}

type FilterType = 'all' | 'approved' | 'blocked' | 'review';

const MODULE_CARDS = [
  {
    id: 'fairshare',
    tab: 'fairshare' as ViewTab,
    tool: null,
    icon: 'group_work',
    label: 'FairShare',
    desc: 'AI group bill split & auto PayPal request dispatch',
    badge: 'Active',
    accent: 'secondary' as const,
    accentColor: 'var(--color-secondary)',
    accentBg: 'var(--color-secondary-container)',
  },
  {
    id: 'dispute',
    tab: 'tools' as ViewTab,
    tool: 'dispute' as ToolSubTab,
    icon: 'gavel',
    label: 'Dispute Resolver',
    desc: 'Automated chargeback & shipping evidence defense',
    badge: 'Ready',
    accent: 'tertiary' as const,
    accentColor: 'var(--color-tertiary)',
    accentBg: 'rgba(5,150,105,0.1)',
  },
  {
    id: 'procurement',
    tab: 'tools' as ViewTab,
    tool: 'procurement' as ToolSubTab,
    icon: 'inventory_2',
    label: 'Procurement',
    desc: 'Autonomous PO matching & contract anomaly scan',
    badge: 'Scanning',
    accent: 'primary' as const,
    accentColor: 'var(--color-primary)',
    accentBg: 'var(--color-primary-fixed)',
  },
  {
    id: 'cfo',
    tab: 'tools' as ViewTab,
    tool: 'cfo' as ToolSubTab,
    icon: 'finance_mode',
    label: 'Freelancer CFO',
    desc: 'Receivables follow-up & liquidity forecasting',
    badge: 'Optimized',
    accent: 'on-surface' as const,
    accentColor: 'var(--color-on-surface-variant)',
    accentBg: 'var(--color-surface-container-highest)',
  },
];

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all',      label: 'All Events' },
  { value: 'approved', label: 'Approved' },
  { value: 'blocked',  label: 'Blocked' },
  { value: 'review',   label: 'Pending' },
];

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  mandates = [],
  transactions,
  pendingCount,
  onNavigateTab,
  onNavigateTool,
  onOpenSimulator,
}) => {
  const [isAgentOnline, setIsAgentOnline] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredTxs = transactions.filter((tx) => filter === 'all' || tx.status === filter);

  const totalPool    = mandates.reduce((s, m) => s + m.monthlyCap, 0);
  const totalSpent   = mandates.reduce((s, m) => s + m.spentAmount, 0);
  const budgetLeft   = Math.max(0, totalPool - totalSpent);
  const budgetPct    = totalPool > 0 ? (budgetLeft / totalPool) * 100 : 0;

  const approvedTxs  = transactions.filter((t) => t.status === 'approved');
  const blockedTxs   = transactions.filter((t) => t.status === 'blocked');
  const clearedAmt   = approvedTxs.reduce((s, t) => s + t.amount, 0);
  const blockedAmt   = blockedTxs.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-4 md:px-6 pt-5 pb-24 gap-5">

      {/* ─── HERO STATUS CARD ─── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface-container-lowest) 0%, var(--color-surface-container) 100%)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Background glow orb */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'var(--glow-primary)', filter: 'blur(40px)', opacity: 0.6 }}
        />

        <div className="relative z-10">
          {/* Status row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full ambient-pulse"
                style={{ background: isAgentOnline ? 'var(--color-tertiary)' : 'var(--color-outline-variant)' }}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-tertiary)' }}>
                {isAgentOnline ? 'Guardrails Active' : 'Standby Mode'}
              </span>
            </div>

            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--card-border)' }}
            >
              <span className="material-symbols-outlined text-[12px]" style={{ color: 'var(--color-primary)' }}>verified_user</span>
              PayPal Rail
            </div>
          </div>

          {/* Main metric */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                Capital Committed Today
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight metric-value" style={{ color: 'var(--color-on-surface)', letterSpacing: '-0.04em' }}>
                  ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                {totalPool > 0 && (
                  <span className="text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                    of ${totalPool.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAgentOnline(!isAgentOnline)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: isAgentOnline ? 'var(--color-primary-container)' : 'var(--color-surface-container-high)',
                  color: isAgentOnline ? 'var(--color-on-primary)' : 'var(--color-on-surface)',
                  boxShadow: isAgentOnline ? '0 2px 10px var(--glow-primary)' : 'none',
                }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isAgentOnline ? 'smart_toy' : 'pause_circle'}
                </span>
                {isAgentOnline ? 'Online' : 'Standby'}
              </button>

              <button
                onClick={onOpenSimulator}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: 'var(--color-secondary-container)',
                  color: 'var(--color-secondary)',
                  border: '1px solid rgba(91,71,245,0.15)',
                }}
                title="Test Spend Simulation"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span className="hidden sm:inline">Simulate</span>
              </button>
            </div>
          </div>

          {/* Budget bar */}
          {totalPool > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Budget Remaining
                </span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
                  {budgetPct.toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${budgetPct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── METRIC GRID 2×2 ─── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Card: Budget Left */}
        <button
          onClick={() => onNavigateTab('mandates')}
          className="data-card p-4 flex flex-col justify-between gap-3 text-left group"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>
              Budget Left
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'var(--glow-primary)', color: 'var(--color-primary)' }}>
              <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
            </div>
          </div>
          <div>
            <span className="text-xl font-black tabular-nums block" style={{ color: 'var(--color-on-surface)', letterSpacing: '-0.03em' }}>
              ${budgetLeft.toLocaleString()}
            </span>
            <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--color-on-surface-variant)' }}>
              of ${totalPool.toLocaleString()} pool
            </span>
          </div>
          <div className="progress-bar-track" style={{ height: '4px' }}>
            <div className="progress-bar-fill" style={{ width: `${budgetPct}%`, height: '4px' }} />
          </div>
        </button>

        {/* Card: Today's Rails */}
        <div className="data-card p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>
              Today's Rails
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--glow-secondary)', color: 'var(--color-secondary)' }}>
              <span className="material-symbols-outlined text-[15px]">bolt</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums" style={{ color: 'var(--color-on-surface)', letterSpacing: '-0.03em' }}>
                {approvedTxs.length}
              </span>
              {approvedTxs.length > 0 && (
                <span className="text-[10px] font-bold flex items-center" style={{ color: 'var(--color-tertiary)' }}>
                  <span className="material-symbols-outlined text-[11px]">trending_up</span>txns
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--color-on-surface-variant)' }}>
              ${clearedAmt.toFixed(2)} via PayPal
            </span>
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit"
            style={{ background: 'var(--glow-tertiary)', color: 'var(--color-tertiary)', border: '1px solid rgba(5,150,105,0.2)' }}
          >
            {approvedTxs.length > 0 ? 'Auto-Cleared' : 'Standing By'}
          </span>
        </div>

        {/* Card: Guardrails */}
        <div className="data-card p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>
              Guardrails
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-error-container)', color: 'var(--color-error)' }}>
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums" style={{ color: blockedTxs.length > 0 ? 'var(--color-error)' : 'var(--color-on-surface)', letterSpacing: '-0.03em' }}>
                {blockedTxs.length}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-error-container)', color: 'var(--color-error)' }}
              >
                {blockedTxs.length > 0 ? 'Blocked' : 'Secure'}
              </span>
            </div>
            <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--color-on-surface-variant)' }}>
              ${blockedAmt.toFixed(2)} protected
            </span>
          </div>
          <span className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>Policy enforcement</span>
        </div>

        {/* Card: Pending */}
        <button
          onClick={() => onNavigateTab('approvals')}
          className="data-card p-4 flex flex-col justify-between gap-3 text-left group"
          style={{ borderColor: pendingCount > 0 ? 'rgba(245,158,11,0.3)' : undefined }}
        >
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>
              Pending
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>notification_important</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums" style={{ color: pendingCount > 0 ? '#d97706' : 'var(--color-on-surface)', letterSpacing: '-0.03em' }}>
                {pendingCount}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}
              >
                {pendingCount > 0 ? 'Review' : 'Clear'}
              </span>
            </div>
            <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--color-on-surface-variant)' }}>
              {pendingCount > 0 ? 'Human nod required' : 'Fiduciary safe'}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pendingCount > 0 ? '#d97706' : 'var(--color-tertiary)' }}>
            {pendingCount > 0 ? 'Tx Cap Exceeded →' : 'All Clear'}
          </span>
        </button>
      </div>

      {/* ─── SETTLEMENT STRIP ─── */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface-container-lowest), var(--color-surface-container-low))',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--glow-primary)', color: 'var(--color-primary)' }}>
            <span className="material-symbols-outlined text-[20px]">sync_alt</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>Auto-Settlement Pipeline</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: 'var(--glow-tertiary)', color: 'var(--color-tertiary)' }}
              >
                LIVE
              </span>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
              Instant batch execution via verified PayPal merchant tokens
            </span>
          </div>
        </div>
        <div
          className="hidden sm:flex items-center px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold"
          style={{ background: 'var(--color-surface-container)', color: 'var(--color-tertiary)', border: '1px solid var(--card-border)' }}
        >
          0.24s
        </div>
      </div>

      {/* ─── ANALYTICS, UTILIZATION DONUT & ONBOARDING STRIP ─── */}
      <CommandAnalyticsPanel
        totalSpent={totalSpent}
        totalPool={totalPool}
        approvedCount={approvedTxs.length}
        blockedCount={blockedTxs.length}
        pendingCount={pendingCount}
        sparklineHistory={[12, 18, 14, 28, 22, 35, Math.max(10, Math.round(totalSpent))]}
        mandatesCount={mandates.length}
        onNavigateTab={onNavigateTab}
        onNavigateTool={onNavigateTool}
      />

      {/* ─── AUTONOMOUS MODULES ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>Autonomous Financial Modules</span>
          <button
            onClick={() => onNavigateTab('tools')}
            className="text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Configure →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MODULE_CARDS.map((mod) => (
            <button
              key={mod.id}
              onClick={() => {
                onNavigateTab(mod.tab);
                if (mod.tool) onNavigateTool?.(mod.tool);
              }}
              className="data-card p-4 flex flex-col gap-2.5 text-left group transition-all active:scale-[0.98]"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ background: mod.accentBg, color: mod.accentColor }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {mod.icon}
                </span>
              </div>
              <div>
                <span className="text-[13px] font-bold block mb-0.5" style={{ color: 'var(--color-on-surface)' }}>
                  {mod.label}
                </span>
                <span className="text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--color-on-surface-variant)' }}>
                  {mod.desc}
                </span>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: mod.accentBg, color: mod.accentColor }}
                >
                  {mod.badge}
                </span>
                <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform" style={{ color: mod.accentColor }}>
                  arrow_forward
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── LIVE AGENT STREAM ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-3 h-3 flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: 'var(--color-tertiary)' }} />
              <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: 'var(--color-tertiary)' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>Live Agent Stream</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>
            Real-Time Ledger
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all"
              style={{
                background: filter === opt.value ? 'var(--color-primary-container)' : 'var(--color-surface-container-lowest)',
                color: filter === opt.value ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                border: `1px solid ${filter === opt.value ? 'transparent' : 'var(--card-border)'}`,
                boxShadow: filter === opt.value ? '0 2px 8px var(--glow-primary)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="space-y-2">
          {filteredTxs.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center flex flex-col items-center gap-3"
              style={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--card-border)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-surface-container)' }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--color-on-surface-variant)' }}>receipt_long</span>
              </div>
              <div>
                <p className="font-bold text-sm mb-1" style={{ color: 'var(--color-on-surface)' }}>No Spend Activity Yet</p>
                <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Transactions from autonomous agents or the Policy Simulator will stream live here.
                </p>
              </div>
              <button
                onClick={onOpenSimulator}
                className="btn-primary-glow px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary)' }}
              >
                Simulate Agent Transaction
              </button>
            </div>
          ) : (
            filteredTxs.map((tx) => {
              const isApproved = tx.status === 'approved';
              const isBlocked  = tx.status === 'blocked';
              const isReview   = tx.status === 'review';

              const statusColor  = isApproved ? 'var(--color-tertiary)' : isBlocked ? 'var(--color-error)' : '#f59e0b';
              const statusBg     = isApproved ? 'var(--glow-tertiary)' : isBlocked ? 'var(--color-error-container)' : 'rgba(245,158,11,0.1)';

              return (
                <div
                  key={tx.id}
                  className="data-card p-4 flex flex-col gap-3 tx-enter"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: statusBg, color: statusColor }}
                      >
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {tx.icon || (isApproved ? 'check_circle' : isBlocked ? 'cancel' : 'pending')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold block truncate" style={{ color: 'var(--color-on-surface)' }}>
                          {tx.title}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                          {tx.merchant} · {tx.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className="text-[15px] font-black tabular-nums metric-value"
                        style={{
                          color: isBlocked ? 'var(--color-error)' : isReview ? '#d97706' : 'var(--color-on-surface)',
                          textDecoration: isBlocked ? 'line-through' : 'none',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {isApproved ? '-' : ''}${tx.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: statusColor }}>
                        {isApproved ? 'via PayPal' : isReview ? 'Held at Gate' : 'Blocked'}
                      </span>
                    </div>
                  </div>

                  {/* Breach reason or PayPal ref */}
                  {(tx.breachReason || tx.paypalOrderId) && (
                    <div
                      className="p-2 rounded-lg text-[11px] font-mono flex items-center justify-between"
                      style={{
                        background: isBlocked ? 'var(--color-error-container)' : 'var(--color-surface-container-low)',
                        color: isBlocked ? 'var(--color-error)' : 'var(--color-on-surface-variant)',
                      }}
                    >
                      {tx.breachReason && (
                        <span className="truncate">Policy Reason: {tx.breachReason}</span>
                      )}
                      {tx.paypalOrderId && (
                        <span className="font-bold text-[10px] ml-auto" style={{ color: 'var(--color-tertiary)' }}>
                          PayPal: {tx.paypalOrderId}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom row */}
                  <div
                    className="flex items-center justify-between pt-2.5"
                    style={{ borderTop: '1px solid var(--card-border)' }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: statusBg, color: statusColor }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                      {tx.badgeText || (isApproved ? 'Cleared' : isBlocked ? 'Blocked' : 'Pending Review')}
                    </span>

                    {isReview ? (
                      <button
                        onClick={() => onNavigateTab('approvals')}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                        style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary)' }}
                      >
                        Review →
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-on-surface-variant)' }}>
                        {tx.agentName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── PAYPAL SETTLEMENT FOOTER ─── */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: 'var(--color-surface-container-low)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)', border: '1px solid var(--card-border)' }}>
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
            <div>
              <span className="text-sm font-bold block" style={{ color: 'var(--color-on-surface)' }}>
                Verified Auto-Settlement
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Connected to PayPal Commercial Rail · Sandbox
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-tertiary)' }}>Enforced</span>
            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--color-tertiary)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
        </div>

        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--card-border)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
            Autonomous Single Tx Threshold:{' '}
            <strong className="font-bold metric-value" style={{ color: 'var(--color-on-surface)' }}>$500.00</strong>
          </span>
          <button
            onClick={() => onNavigateTab('mandates')}
            className="text-xs font-bold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Adjust Rules →
          </button>
        </div>
      </div>

    </div>
  );
};
