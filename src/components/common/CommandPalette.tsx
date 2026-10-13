'use client';

import React, { useState, useEffect } from 'react';
import { ViewTab, ToolSubTab } from '@/types';

interface CommandPaletteProps {
  onNavigateTab: (tab: ViewTab) => void;
  onNavigateTool: (tool: ToolSubTab) => void;
  onOpenSimulator: () => void;
  onLoadDemoData: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onNavigateTab,
  onNavigateTool,
  onOpenSimulator,
  onLoadDemoData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const ACTIONS = [
    { label: 'Go to Command Center', icon: 'dashboard', category: 'Navigation', action: () => onNavigateTab('command') },
    { label: 'View Mandates Registry', icon: 'shield', category: 'Navigation', action: () => onNavigateTab('mandates') },
    { label: 'Open Approvals Queue', icon: 'gavel', category: 'Navigation', action: () => onNavigateTab('approvals') },
    { label: 'Open FairShare Bill Splitter', icon: 'pie_chart', category: 'Navigation', action: () => onNavigateTab('fairshare') },
    { label: 'Spend Firewall Simulator', icon: 'science', category: 'Tools', action: () => { onNavigateTool('simulator'); onNavigateTab('tools'); } },
    { label: 'Autonomous Agent Playground (NEW)', icon: 'smart_toy', category: 'Tools', action: () => { onNavigateTool('playground'); onNavigateTab('tools'); } },
    { label: 'Prompt-Injection Shield / Attack Lab (NEW)', icon: 'shield_with_heart', category: 'Tools', action: () => { onNavigateTool('attack-lab'); onNavigateTab('tools'); } },
    { label: 'Red-Team Scoreboard (NEW)', icon: 'bug_report', category: 'Tools', action: () => { onNavigateTool('red-team'); onNavigateTab('tools'); } },
    { label: 'Tamper-Evident Ledger (NEW)', icon: 'verified', category: 'Tools', action: () => { onNavigateTool('ledger'); onNavigateTab('tools'); } },
    { label: 'Agent Marketplace Negotiation (NEW)', icon: 'storefront', category: 'Tools', action: () => { onNavigateTool('marketplace'); onNavigateTab('tools'); } },
    { label: 'AI Dispute Resolver', icon: 'balance', category: 'Tools', action: () => { onNavigateTool('dispute'); onNavigateTab('tools'); } },
    { label: 'AI Procurement Scanner', icon: 'receipt_long', category: 'Tools', action: () => { onNavigateTool('procurement'); onNavigateTab('tools'); } },
    { label: 'Freelancer CFO Assistant', icon: 'psychology', category: 'Tools', action: () => { onNavigateTool('cfo'); onNavigateTab('tools'); } },
    { label: 'Load Realistic Sandbox Demo Data', icon: 'database', category: 'Actions', action: onLoadDemoData },
  ];

  const filtered = ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden space-y-2">
        <div className="p-3 border-b border-outline-variant/20 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px]">search</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a screen, tool, or action... (Esc to close)"
            className="flex-1 bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
          />
          <kbd className="px-2 py-0.5 rounded bg-surface-container text-[10px] font-mono font-bold text-on-surface-variant">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-on-surface-variant">No matching actions found</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                className="w-full p-2.5 rounded-xl hover:bg-surface-container flex items-center justify-between text-left text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="font-semibold text-on-surface">{item.label}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
