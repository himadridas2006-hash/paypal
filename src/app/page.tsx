'use client';

import React, { useState } from 'react';
import { ViewTab, ToolSubTab, AgentMandate, TransactionActivity, EscalatedApproval } from '@/types';
import { INITIAL_MANDATES, INITIAL_TRANSACTIONS, INITIAL_APPROVALS } from '@/lib/mock-data';
import { Header, ThemeMode } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { CommandCenterView } from '@/components/command/CommandCenterView';
import { MandatesView } from '@/components/mandates/MandatesView';
import { ApprovalsView } from '@/components/approvals/ApprovalsView';
import { FairShareView } from '@/components/modules/FairShareView';
import { ToolsView } from '@/components/modules/ToolsView';
import { InsightsRail } from '@/components/layout/InsightsRail';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('command');
  const [toolSubTab, setToolSubTab] = useState<ToolSubTab>('simulator');
  const [isSandbox, setIsSandbox] = useState(true);
  const [vaultBalance, setVaultBalance] = useState(18450.0);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('light');

  const [mandates, setMandates] = useState<AgentMandate[]>(INITIAL_MANDATES);
  const [transactions, setTransactions] = useState<TransactionActivity[]>(INITIAL_TRANSACTIONS);
  const [approvals, setApprovals] = useState<EscalatedApproval[]>(INITIAL_APPROVALS);

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  // Handlers
  const handleToggleMandateStatus = (id: string) => {
    setMandates((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === 'active' ? 'paused' : 'active' }
          : m
      )
    );
  };

  const handleAddMandate = (newMandate: AgentMandate) => {
    setMandates((prev) => [newMandate, ...prev]);
  };

  const handleManualPayMandate = (id: string, amount: number, memo?: string) => {
    const mandate = mandates.find((m) => m.id === id);
    if (!mandate) return;

    setMandates((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, spentAmount: Math.min(m.monthlyCap, m.spentAmount + amount) } : m
      )
    );
    setVaultBalance((prev) => Math.max(0, prev - amount));

    const newTx: TransactionActivity = {
      id: `tx-manual-${Date.now().toString().slice(-4)}`,
      title: `${mandate.name} (Manual Early Settlement)`,
      merchant: memo || mandate.whitelistedMerchants[0] || 'PayPal Direct Rail',
      timestamp: 'Just now',
      amount: amount,
      status: 'approved',
      agentName: mandate.name,
      category: 'Early Settlement',
      icon: 'payments',
      iconBg: 'bg-surface-container-low',
      iconColor: 'text-primary',
      riskScore: 10,
      badgeText: 'Manual Settle · Paid Early',
      subText: 'via PayPal Commercial Sandbox',
      paypalOrderId: `PAYID-MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleApproveEscalation = (id: string) => {
    const esc = approvals.find((a) => a.id === id);
    if (!esc) return;

    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );

    // Deduct from Vault
    setVaultBalance((prev) => Math.max(0, prev - esc.amount));

    // Update Mandate Spent Amount & Runway
    setMandates((prev) =>
      prev.map((m) => {
        const isTarget =
          (esc.mandateId && m.id === esc.mandateId) ||
          m.name.toLowerCase() === esc.agentName.toLowerCase() ||
          m.id.toLowerCase() === esc.agentName.toLowerCase() ||
          (prev.length === 1);

        if (isTarget) {
          return {
            ...m,
            spentAmount: m.spentAmount + esc.amount,
          };
        }
        return m;
      })
    );

    const newTx: TransactionActivity = {
      id: `tx-approved-${Date.now().toString().slice(-4)}`,
      title: `${esc.merchant} (Human Authorized)`,
      merchant: esc.merchant,
      timestamp: 'Just now',
      amount: esc.amount,
      status: 'approved',
      agentName: esc.agentName,
      category: 'Approved Override',
      icon: esc.icon,
      iconBg: 'bg-surface-container-low',
      iconColor: 'text-primary',
      riskScore: esc.riskScore,
      badgeText: 'Approved with PayPal · Captured',
      subText: 'via PayPal Commercial Rail',
      paypalOrderId: `PAYID-CAPTURED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleDenyEscalation = (id: string) => {
    const esc = approvals.find((a) => a.id === id);
    if (!esc) return;

    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'denied' } : a))
    );

    const newTx: TransactionActivity = {
      id: `tx-denied-${Date.now().toString().slice(-4)}`,
      title: `${esc.merchant} (Denied by Human)`,
      merchant: esc.merchant,
      timestamp: 'Just now',
      amount: esc.amount,
      status: 'blocked',
      agentName: esc.agentName,
      category: 'Denied Override',
      icon: 'cancel',
      iconBg: 'bg-error-container',
      iconColor: 'text-error',
      riskScore: esc.riskScore,
      badgeText: 'Denied: Zero Capital Leakage',
      subText: 'Fiduciary Block Enforced',
      breachReason: esc.breachExplanation,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleNewTransaction = (tx: TransactionActivity) => {
    setTransactions((prev) => [tx, ...prev]);
    if (tx.status === 'approved') {
      setVaultBalance((prev) => Math.max(0, prev - tx.amount));
      if (tx.agentName) {
        setMandates((prev) =>
          prev.map((m) => {
            if (
              m.name.toLowerCase() === tx.agentName!.toLowerCase() ||
              m.id.toLowerCase() === tx.agentName!.toLowerCase() ||
              (prev.length === 1)
            ) {
              return {
                ...m,
                spentAmount: m.spentAmount + tx.amount,
              };
            }
            return m;
          })
        );
      }
    }
  };

  const handleNewEscalation = (esc: EscalatedApproval) => {
    setApprovals((prev) => [esc, ...prev]);
  };

  // Demo Data Loader & Reset for Sandbox
  const handleLoadDemoData = () => {
    setMandates(INITIAL_MANDATES);
    setTransactions(INITIAL_TRANSACTIONS);
    setApprovals(INITIAL_APPROVALS);
    setVaultBalance(18450.0);
  };

  const handleResetData = () => {
    setMandates(INITIAL_MANDATES.slice(0, 1));
    setTransactions([]);
    setApprovals([]);
    setVaultBalance(5000.0);
  };

  return (
    <div className={`flex flex-col min-h-screen bg-surface theme-${currentTheme} transition-colors duration-300 relative selection:bg-primary/20`}>
      {/* Fixed Top Header */}
      <Header
        currentTab={currentTab}
        isSandbox={isSandbox}
        onToggleSandbox={() => setIsSandbox(!isSandbox)}
        vaultBalance={vaultBalance}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      {/* Main Responsive Grid Container */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pt-20 pb-28">
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* Main Primary View Area */}
          <main className="flex-1 w-full min-w-0">
            {currentTab === 'command' && (
              <CommandCenterView
                mandates={mandates}
                transactions={transactions}
                pendingCount={pendingApprovalsCount}
                onNavigateTab={setCurrentTab}
                onNavigateTool={(tool) => {
                  setToolSubTab(tool);
                  setCurrentTab('tools');
                }}
                onOpenSimulator={() => {
                  setToolSubTab('simulator');
                  setCurrentTab('tools');
                }}
              />
            )}

            {currentTab === 'mandates' && (
              <MandatesView
                mandates={mandates}
                onToggleMandateStatus={handleToggleMandateStatus}
                onAddMandate={handleAddMandate}
                onManualPayMandate={handleManualPayMandate}
              />
            )}

            {currentTab === 'approvals' && (
              <ApprovalsView
                approvals={approvals}
                onApprove={handleApproveEscalation}
                onDeny={handleDenyEscalation}
                onNavigateTab={setCurrentTab}
                onSimulateEscalation={() => {
                  setToolSubTab('simulator');
                  setCurrentTab('tools');
                }}
              />
            )}

            {currentTab === 'fairshare' && <FairShareView />}

            {currentTab === 'tools' && (
              <ToolsView
                mandates={mandates}
                initialSubTab={toolSubTab}
                onNewTransaction={handleNewTransaction}
                onNewEscalation={handleNewEscalation}
                onNavigateTab={setCurrentTab}
              />
            )}
          </main>

          {/* Sticky Desktop Insights Rail (Visible on >= 1280px / xl) */}
          <aside className="hidden xl:block w-[340px] shrink-0 sticky top-20 self-start">
            <InsightsRail
              mandates={mandates}
              transactions={transactions}
              pendingApprovalsCount={pendingApprovalsCount}
              onNavigateTab={setCurrentTab}
              onNavigateTool={(tool) => {
                setToolSubTab(tool);
                setCurrentTab('tools');
              }}
              onLoadDemoData={handleLoadDemoData}
            />
          </aside>
        </div>
      </div>

      {/* Global Application Footer */}
      <footer className="w-full py-4 text-center text-xs text-on-surface-variant/80 border-t border-outline-variant/15 flex flex-wrap items-center justify-center gap-3 relative z-10 mb-16 bg-surface/80 backdrop-blur-sm">
        <span className="font-medium">Powered by PayPal Sandbox · Mandate</span>
        <span className="opacity-40">•</span>
        <button
          onClick={handleLoadDemoData}
          className="hover:text-primary transition-colors cursor-pointer font-semibold underline text-[11px]"
        >
          Load Sandbox Demo Data
        </button>
        <span className="opacity-40">•</span>
        <button
          onClick={handleResetData}
          className="hover:text-error transition-colors cursor-pointer text-[11px]"
        >
          Reset Demo State
        </button>
      </footer>

      {/* Fixed Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={pendingApprovalsCount}
      />
    </div>
  );
}
