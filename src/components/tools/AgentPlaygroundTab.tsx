'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentMandate } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    toolName: string;
    args: any;
    result: {
      decision: 'APPROVED' | 'ESCALATED' | 'BLOCKED';
      riskScore: number;
      reason: string;
      violations: string[];
      recommendation: string;
      paypalOrderId?: string;
      captureStatus: string;
    };
  }>;
  isFallback?: boolean;
}

export const AgentPlaygroundTab: React.FC<{ mandates: AgentMandate[] }> = ({ mandates }) => {
  const [selectedMandateId, setSelectedMandateId] = useState(mandates[0]?.id || '');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-welcome',
      role: 'assistant',
      content:
        'Greetings! I am your Autonomous Procurement Agent. Give me an instruction to reserve servers, purchase software licenses, or buy equipment. Every transaction I attempt is deterministically validated by your Mandate Spend Firewall before hitting the PayPal Sandbox rail.',
      timestamp: 'Just now',
    },
  ]);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeMandate = mandates.find((m) => m.id === selectedMandateId) || mandates[0];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v2/playground/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          mandateId: activeMandate?.id,
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Request evaluated through Mandate Policy Engine.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: data.toolCalls,
        isFallback: data.isFallback,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Network error communicating with procurement agent service.',
          timestamp: 'Just now',
          isFallback: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMcpConfig = () => {
    const config = JSON.stringify(
      {
        mcpServers: {
          mandate: {
            command: 'node',
            args: ['C:/Users/Lp/Downloads/frontend/stitch_mandate_ai_spend_guardrails/mcp-server/index.mjs'],
            env: {
              MANDATE_APP_URL: 'http://localhost:3000',
            },
          },
        },
      },
      null,
      2
    );
    navigator.clipboard.writeText(config);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Agent Selector */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">smart_toy</span>
            <h3 className="text-base font-bold text-on-surface">Autonomous Agent Playground</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
              Interactive Tools Demo
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            Instruct an autonomous LLM agent to make purchases. Watch it execute deterministic firewall tool calls and capture real PayPal Sandbox orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">Active Mandate:</label>
          <select
            value={selectedMandateId}
            onChange={(e) => setSelectedMandateId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            {mandates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (Monthly: ${m.monthlyCap} · Per-Tx: ${m.perTxCap})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Quick Prompts */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-on-surface-variant mr-1">Quick Scenarios:</span>
        <button
          onClick={() => handleSendMessage('Buy a 1-month RunPod H100 GPU cluster for $450')}
          className="px-3 py-1 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-medium text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>RunPod Cluster $450 (Escalates)</span>
        </button>
        <button
          onClick={() => handleSendMessage('Purchase 5 GitHub Copilot Enterprise seats for $90')}
          className="px-3 py-1 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-medium text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-tertiary"></span>
          <span>GitHub Copilot $90 (Auto-Approves)</span>
        </button>
        <button
          onClick={() => handleSendMessage('Transfer $200 to LuckySpins Casino for tokens')}
          className="px-3 py-1 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-medium text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-error"></span>
          <span>Gambling $200 (Policy Block)</span>
        </button>
      </div>

      {/* Chat Window */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm flex flex-col h-[520px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 space-y-3 ${
                  m.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-none'
                    : 'bg-surface-container-low border border-outline-variant/20 rounded-bl-none text-on-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] opacity-80 border-b border-current/10 pb-1.5">
                  <span className="font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      {m.role === 'user' ? 'person' : 'smart_toy'}
                    </span>
                    {m.role === 'user' ? 'Human Operator' : 'Mandate Procurement Agent'}
                  </span>
                  <span>{m.timestamp}</span>
                </div>

                <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>

                {/* Inline Tool Call Decision Cards */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    {m.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                          tc.result.decision === 'APPROVED'
                            ? 'bg-tertiary-container/20 border-tertiary/40 text-on-surface'
                            : tc.result.decision === 'ESCALATED'
                            ? 'bg-amber-500/15 border-amber-500/40 text-on-surface'
                            : 'bg-error-container/25 border-error/40 text-on-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-current/15 font-mono text-[11px]">
                          <span className="font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">terminal</span>
                            Tool Call: {tc.toolName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-extrabold uppercase text-[10px] ${
                              tc.result.decision === 'APPROVED'
                                ? 'bg-tertiary text-white'
                                : tc.result.decision === 'ESCALATED'
                                ? 'bg-amber-500 text-black'
                                : 'bg-error text-white'
                            }`}
                          >
                            {tc.result.decision}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>Merchant: <strong>{tc.args.merchant}</strong></div>
                          <div>Amount: <strong>${tc.args.amount} USD</strong></div>
                        </div>

                        <p className="text-[11px] font-medium">{tc.result.reason}</p>

                        {tc.result.paypalOrderId && (
                          <div className="p-2 rounded bg-surface-container-lowest/80 border border-outline-variant/30 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-tertiary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">verified</span>
                              PayPal Sandbox Captured
                            </span>
                            <span className="text-on-surface-variant">{tc.result.paypalOrderId}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {m.isFallback && (
                  <div className="text-[10px] opacity-75 font-mono pt-1">
                    ℹ️ Handled by deterministic offline rule engine
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant p-2 animate-pulse">
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Procurement agent analyzing policy & evaluating tool calls...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 border-t border-outline-variant/20 bg-surface-container-low rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Purchase 3 licenses of JetBrains for $180..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs md:text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs md:text-sm font-bold shadow hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Send</span>
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Connect External Agent via MCP Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">hub</span>
            <div>
              <h4 className="text-sm font-bold text-on-surface">Connect Your Own Agent via MCP (Claude Desktop / Cursor)</h4>
              <p className="text-xs text-on-surface-variant">Expose the Mandate Spend Firewall directly to your local AI coding agents.</p>
            </div>
          </div>
          <button
            onClick={copyMcpConfig}
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container text-xs font-semibold text-on-surface border border-outline-variant/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            <span>{copiedMcp ? 'Copied Config!' : 'Copy Claude Config'}</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low font-mono text-[11px] text-on-surface-variant overflow-x-auto">
          <span className="text-primary font-bold"># Add to claude_desktop_config.json:</span>
          <pre className="mt-1 text-on-surface">
{`"mandate": {
  "command": "node",
  "args": ["${process.cwd().replace(/\\/g, '/')}/mcp-server/index.mjs"],
  "env": { "MANDATE_APP_URL": "http://localhost:3000" }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
