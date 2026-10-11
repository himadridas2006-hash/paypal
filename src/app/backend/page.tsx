'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { INITIAL_MANDATES, INITIAL_TRANSACTIONS } from '@/lib/mock-data';

export default function BackendConsolePage() {
  const [mounted, setMounted] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState(2);
  const [responseStatus, setResponseStatus] = useState('200 OK');
  const [jsonResponse, setJsonResponse] = useState<any>({
    status: 'ok',
    paypalConnected: true,
    mode: 'sandbox_live',
    environment: 'sandbox',
    timestamp: '2026-10-11T15:10:27.521Z',
  });
  const [loadingEndpoint, setLoadingEndpoint] = useState<string | null>(null);

  // POST create-order input states (starts blank for user to fill)
  const [merchantInput, setMerchantInput] = useState('');
  const [amountInput, setAmountInput] = useState('');

  // Live in-memory state for the two tables
  const [serverMandates, setServerMandates] = useState<any[]>(INITIAL_MANDATES);
  const [auditLogs, setAuditLogs] = useState<any[]>(INITIAL_TRANSACTIONS);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);

    // Initial load of server mandates & audit logs
    fetchMandates();
    fetchAuditLogs();

    return () => clearInterval(timer);
  }, []);

  const fetchMandates = async () => {
    try {
      const res = await fetch('/api/mandates');
      const data = await res.json();
      if (data?.mandates && Array.isArray(data.mandates)) {
        setServerMandates(data.mandates);
      }
    } catch {
      // Keep initial mandates
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data?.ledger && Array.isArray(data.ledger)) {
        setAuditLogs(data.ledger);
      }
    } catch {
      // Keep initial logs
    } finally {
      setLoadingAudit(false);
    }
  };

  const formatUptime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleExecute = async (endpoint: string) => {
    setLoadingEndpoint(endpoint);
    try {
      const res = await fetch(endpoint);
      setResponseStatus(`${res.status} ${res.statusText || 'OK'}`);
      const data = await res.json();
      setJsonResponse(data);

      if (endpoint === '/api/mandates' && data.mandates) {
        setServerMandates(data.mandates);
      } else if (endpoint === '/api/audit' && data.ledger) {
        setAuditLogs(data.ledger);
      }
    } catch (err: any) {
      setResponseStatus('500 Error');
      setJsonResponse({ error: err.message });
    } finally {
      setLoadingEndpoint(null);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantInput.trim() || !amountInput) return;

    setLoadingEndpoint('/api/paypal/create-order');
    try {
      const amt = parseFloat(amountInput) || 450.0;
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          merchantName: merchantInput,
          description: `Backend Console Test Order for ${merchantInput}`,
        }),
      });
      setResponseStatus(`${res.status} ${res.statusText || 'OK'}`);
      const data = await res.json();
      setJsonResponse(data);

      // Append real decision to the live audit trail table
      const newAuditEntry = {
        id: `audit-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleTimeString(),
        merchant: merchantInput,
        amount: amt,
        status: data.id ? 'approved' : 'blocked',
        decision: data.id ? 'APPROVED' : 'BLOCKED',
        rule: data.id
          ? `PayPal Sandbox Order Created & Captured: ${data.id}`
          : 'Guardrail Intercepted Transaction',
        paypalOrderId: data.id || null,
        breachReason: data.error || null,
      };
      setAuditLogs((prev) => [newAuditEntry, ...prev]);
    } catch (err: any) {
      setResponseStatus('500 Error');
      setJsonResponse({ error: err.message });
    } finally {
      setLoadingEndpoint(null);
    }
  };

  const handleResetStore = () => {
    handleExecute('/api/health');
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#070b14] text-slate-100 font-mono p-4 sm:p-6 lg:p-8 flex flex-col gap-6 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/20">
            &gt;_
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              Mandate Server &amp; API Console
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Next.js 15 Full-Stack · PayPal Server SDK · Live Runtime
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>REST API Online</span>
          </div>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-all flex items-center gap-2 shadow-sm font-sans"
          >
            <span>← Open Web App GUI</span>
          </Link>
        </div>
      </header>

      {/* Telemetry Metric Cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1 */}
        <div className="bg-[#0e1626] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            PORT / PROTOCOL
          </span>
          <span className="text-base font-bold text-white my-1 tracking-tight">3000 / HTTP</span>
          <span className="text-[11px] text-slate-500">Local Dev Server</span>
        </div>

        {/* Card 2 */}
        <div className="bg-[#0e1626] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            PAYPAL SANDBOX
          </span>
          <span className="text-base font-bold text-emerald-400 my-1 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            CONNECTED
          </span>
          <span className="text-[11px] text-slate-500">Orders v2 REST Rail</span>
        </div>

        {/* Card 3 */}
        <div className="bg-[#0e1626] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            GUARDRAILS ENGINE
          </span>
          <span className="text-base font-bold text-emerald-400 my-1 tracking-tight">
            Online · Enforcing
          </span>
          <span className="text-[11px] text-slate-500">Merchant, Cap, Budget &amp; Expiry</span>
        </div>

        {/* Card 4 */}
        <div className="bg-[#0e1626] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            IN-MEMORY MANDATES
          </span>
          <span className="text-base font-bold text-white my-1 tracking-tight">
            {serverMandates.length} Active
          </span>
          <span className="text-[11px] text-slate-500">SaaS, Compute, Operations</span>
        </div>

        {/* Card 5 */}
        <div className="bg-[#0e1626] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-sm col-span-2 md:col-span-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            SERVER UPTIME
          </span>
          <span
            suppressHydrationWarning
            className="text-base font-bold text-white my-1 tracking-tight tabular-nums"
          >
            {mounted ? formatUptime(uptimeSeconds) : '0m 02s'}
          </span>
          <span className="text-[11px] text-slate-500">Node.js Engine v22</span>
        </div>
      </section>

      {/* Main Workspace (2 Columns) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: REST Endpoints & Quick Tester */}
        <div className="bg-[#0e1626] border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
            <h2 className="text-sm font-bold text-white tracking-wide font-sans">
              REST Endpoints &amp; Quick Tester
            </h2>
            <button
              onClick={handleResetStore}
              className="text-xs text-slate-300 hover:text-white px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>↺</span>
              <span>Reset Server Store</span>
            </button>
          </div>

          <div className="space-y-3">
            {/* 1. GET /api/health */}
            <div className="p-3.5 rounded-xl bg-[#09101d] border border-slate-800/60 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  GET
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100 block truncate">/api/health</span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Backend health &amp; PayPal credentials check
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleExecute('/api/health')}
                disabled={loadingEndpoint === '/api/health'}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 shrink-0"
              >
                {loadingEndpoint === '/api/health' ? 'Running...' : 'Execute'}
              </button>
            </div>

            {/* 2. GET /api/dashboard */}
            <div className="p-3.5 rounded-xl bg-[#09101d] border border-slate-800/60 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  GET
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100 block truncate">/api/dashboard</span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Calculated budget totals, committed pool &amp; velocity
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleExecute('/api/dashboard')}
                disabled={loadingEndpoint === '/api/dashboard'}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 shrink-0"
              >
                {loadingEndpoint === '/api/dashboard' ? 'Running...' : 'Execute'}
              </button>
            </div>

            {/* 3. GET /api/mandates */}
            <div className="p-3.5 rounded-xl bg-[#09101d] border border-slate-800/60 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  GET
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100 block truncate">/api/mandates</span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Live agent spend mandates &amp; utilization
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleExecute('/api/mandates')}
                disabled={loadingEndpoint === '/api/mandates'}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 shrink-0"
              >
                {loadingEndpoint === '/api/mandates' ? 'Running...' : 'Execute'}
              </button>
            </div>

            {/* 4. GET /api/approvals */}
            <div className="p-3.5 rounded-xl bg-[#09101d] border border-slate-800/60 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  GET
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100 block truncate">/api/approvals</span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Human-in-the-loop approvals queue
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleExecute('/api/approvals')}
                disabled={loadingEndpoint === '/api/approvals'}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 shrink-0"
              >
                {loadingEndpoint === '/api/approvals' ? 'Running...' : 'Execute'}
              </button>
            </div>

            {/* 5. GET /api/audit */}
            <div className="p-3.5 rounded-xl bg-[#09101d] border border-slate-800/60 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                  GET
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100 block truncate">/api/audit</span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Tamper-evident policy decision log
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleExecute('/api/audit')}
                disabled={loadingEndpoint === '/api/audit'}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 shrink-0"
              >
                {loadingEndpoint === '/api/audit' ? 'Running...' : 'Execute'}
              </button>
            </div>

            {/* 6. POST /api/paypal/create-order Form Box */}
            <div className="p-3.5 rounded-xl bg-[#09101d] border border-slate-800/60 space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  POST
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-100 block">/api/paypal/create-order</span>
                  <span className="text-[11px] text-slate-400 block">
                    Test PayPal sandbox order creation with guardrail evaluation
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateOrder} className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <input
                  type="text"
                  value={merchantInput}
                  onChange={(e) => setMerchantInput(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="Merchant Name"
                />
                <input
                  type="text"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full sm:w-28 px-3 py-2 rounded-lg bg-[#070b14] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 font-mono text-right"
                  placeholder="450.00"
                />
                <button
                  type="submit"
                  disabled={loadingEndpoint === '/api/paypal/create-order'}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#eab308] hover:bg-[#facc15] text-slate-950 text-xs font-bold tracking-tight shadow-md transition-all active:scale-95 whitespace-nowrap font-sans"
                >
                  {loadingEndpoint === '/api/paypal/create-order' ? 'Creating...' : 'Create Sandbox Order'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: LIVE JSON RESPONSE CONSOLE */}
        <div className="bg-[#0e1626] border border-slate-800/80 rounded-2xl p-5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/70 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              LIVE JSON RESPONSE CONSOLE
            </h2>
            <span className="text-xs font-semibold text-emerald-400 font-mono">
              Status: {responseStatus}
            </span>
          </div>

          <div className="flex-1 rounded-xl bg-[#070b14] p-4 border border-slate-800/90 overflow-auto font-mono text-xs leading-relaxed text-blue-300 min-h-[300px]">
            <pre className="text-slate-200">
              {JSON.stringify(jsonResponse, null, 2)}
            </pre>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: LIVE SERVER IN-MEMORY MANDATES (From Screenshot)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#0e1626] border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
          <h2 className="text-sm font-bold text-white tracking-wide font-sans flex items-center gap-2">
            Live Server In-Memory Mandates
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider">
            Synchronized
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-2.5 px-3">MANDATE ID</th>
                <th className="py-2.5 px-3">AGENT &amp; PURPOSE</th>
                <th className="py-2.5 px-3">SPENT / LIMIT</th>
                <th className="py-2.5 px-3">TX CAP</th>
                <th className="py-2.5 px-3">REVIEW ABOVE</th>
                <th className="py-2.5 px-3">AUTHORIZED MERCHANTS</th>
                <th className="py-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {serverMandates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-sans">
                    No mandates configured on server yet. Create a mandate in the app or via POST /api/mandates.
                  </td>
                </tr>
              ) : (
                serverMandates.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{m.id}</td>
                    <td className="py-2.5 px-3 text-white font-sans font-semibold">{m.name}</td>
                    <td className="py-2.5 px-3 text-slate-200">
                      ${m.spentAmount.toLocaleString()} / ${m.monthlyCap.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">${m.perTxCap}</td>
                    <td className="py-2.5 px-3 text-slate-300">${m.approvalTrigger}</td>
                    <td
                      className="py-2.5 px-3 text-slate-400 truncate max-w-[200px]"
                      title={m.whitelistedMerchants?.join(', ')}
                    >
                      {m.whitelistedMerchants?.slice(0, 3).join(', ')}
                      {m.whitelistedMerchants?.length > 3
                        ? ` +${m.whitelistedMerchants.length - 3}`
                        : ''}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                        {m.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: SERVER POLICY AUDIT TRAIL (From Screenshot)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#0e1626] border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
          <h2 className="text-sm font-bold text-white tracking-wide font-sans flex items-center gap-2">
            Server Policy Audit Trail
          </h2>
          <button
            onClick={fetchAuditLogs}
            disabled={loadingAudit}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <span>{loadingAudit ? 'Refreshing...' : 'Refresh Log'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">ACTION</th>
                <th className="py-2.5 px-3">DECISION</th>
                <th className="py-2.5 px-3">REASON &amp; POLICY RULE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-xs font-sans">
                    No transactions logged yet. Run a payment or test order above.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const isApproved = log.status === 'approved' || log.decision === 'APPROVED';
                  const isBlocked = log.status === 'blocked' || log.decision === 'BLOCKED';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {log.timestamp || 'Just now'}
                      </td>
                      <td className="py-2.5 px-3 text-white font-semibold">
                        {log.merchant
                          ? `POST /api/paypal/create-order (${log.merchant} · $${log.amount})`
                          : log.action || 'PAYPAL_ORDER_DISPATCH'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isApproved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isBlocked
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isApproved ? 'APPROVED' : isBlocked ? 'BLOCKED' : 'ESCALATED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        {log.rule ||
                          log.breachReason ||
                          log.reason ||
                          'Guardrail validated against active mandate boundaries.'}
                        {log.paypalOrderId && (
                          <span className="block text-[10px] text-blue-400 font-mono mt-0.5">
                            PayPal Ref: {log.paypalOrderId}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
