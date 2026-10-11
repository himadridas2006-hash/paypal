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

export default function Home() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('command');
  const [toolSubTab, setToolSubTab] = useState<ToolSubTab>('simulator');
  const [isSandbox, setIsSandbox] = useState(true);
  const [vaultBalance, setVaultBalance] = useState(0.0);
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

  const handleApproveEscalation = (id: string) => {
    const esc = approvals.find((a) => a.id === id);
    if (!esc) return;

    // Update approval status
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );

    // Deduct from vault
    setVaultBalance((prev) => Math.max(0, prev - esc.amount));

    // Append to live transaction stream
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
    }
  };

  const handleNewEscalation = (esc: EscalatedApproval) => {
    setApprovals((prev) => [esc, ...prev]);
  };

  return (
    <div className={`flex flex-col min-h-screen bg-surface theme-${currentTheme} transition-colors duration-300`}>
      {/* Fixed Top Header */}
      <Header
        currentTab={currentTab}
        isSandbox={isSandbox}
        onToggleSandbox={() => setIsSandbox(!isSandbox)}
        vaultBalance={vaultBalance}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16 pb-20">
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
          />
        )}

        {currentTab === 'approvals' && (
          <ApprovalsView
            approvals={approvals}
            onApprove={handleApproveEscalation}
            onDeny={handleDenyEscalation}
          />
        )}

        {currentTab === 'fairshare' && <FairShareView />}

        {currentTab === 'tools' && (
          <ToolsView
            mandates={mandates}
            initialSubTab={toolSubTab}
            onNewTransaction={handleNewTransaction}
            onNewEscalation={handleNewEscalation}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={pendingApprovalsCount}
      />
    </div>
  );
}
