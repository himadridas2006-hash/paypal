'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ViewTab } from '@/types';

export type ThemeMode = 'light' | 'dark' | 'forest';

interface HeaderProps {
  currentTab: ViewTab;
  isSandbox: boolean;
  onToggleSandbox: () => void;
  vaultBalance: number;
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
}

const THEME_SEGMENTS: { mode: ThemeMode; icon: string; label: string; color: string }[] = [
  { mode: 'light', icon: 'light_mode',  label: 'Light',  color: '#f59e0b' },
  { mode: 'dark',  icon: 'dark_mode',   label: 'Dark',   color: '#60a5fa' },
  { mode: 'forest',icon: 'forest',      label: 'Forest', color: '#10d98b' },
];

const SUBTITLES: Record<ViewTab, string> = {
  command:   'Command Center',
  mandates:  'Spend Mandates',
  approvals: 'Approval Queue',
  fairshare: 'FairShare Arbiter',
  tools:     'Autonomous Tools',
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  isSandbox,
  onToggleSandbox,
  vaultBalance,
  currentTheme,
  onSelectTheme,
}) => {
  const [vaultHover, setVaultHover] = useState(false);

  return (
    <header
      className="fixed top-0 w-full z-50 pt-safe transition-colors duration-300"
      style={{ background: 'var(--header-bg)', backdropFilter: 'blur(24px) saturate(1.9)', WebkitBackdropFilter: 'blur(24px) saturate(1.9)', borderBottom: '1px solid var(--card-border)', boxShadow: '0 1px 16px rgba(0,0,0,0.05)' }}
    >
      {/* Animated gradient accent line */}
      <div className="gradient-line absolute top-0 left-0 right-0 h-[2px]" />

      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-2 max-w-7xl mx-auto">

        {/* ── Brand Left ── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo mark */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-secondary))', boxShadow: '0 2px 12px var(--glow-primary)' }}
          >
            <span className="material-symbols-outlined text-white text-[18px] font-bold relative z-10">shield_with_heart</span>
          </div>

          {/* Brand name + page */}
          <div className="flex flex-col min-w-0 leading-none">
            <span className="text-[13px] font-bold tracking-tight gradient-text">
              Mandate
            </span>
            <span className="text-[10px] font-medium mt-0.5 truncate" style={{ color: 'var(--color-on-surface-variant)' }}>
              {SUBTITLES[currentTab]}
            </span>
          </div>
        </div>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2">

          {/* 1. Three-way Theme Slider */}
          <div className="theme-slider">
            {THEME_SEGMENTS.map((seg) => {
              const isActive = currentTheme === seg.mode;
              return (
                <button
                  key={seg.mode}
                  onClick={() => onSelectTheme(seg.mode)}
                  className={`theme-slider-btn ${isActive ? 'active' : ''}`}
                  title={`Switch to ${seg.label} Mode`}
                  type="button"
                  style={isActive ? { color: seg.color } : {}}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ color: isActive ? seg.color : undefined }}>
                    {seg.icon}
                  </span>
                  <span className="hidden sm:inline">{seg.label}</span>
                </button>
              );
            })}
          </div>

          {/* 2. Backend Console Button (Always Visible) */}
          <Link
            href="/backend"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-white text-[11px] sm:text-xs font-bold transition-all active:scale-95 shadow-md shrink-0 hover:opacity-95"
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            }}
            title="Connect to Mandate Server & API Console"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold tracking-tight">&gt;_ Backend</span>
          </Link>

          {/* 3. Sandbox / Live Pill */}
          <button
            onClick={onToggleSandbox}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
            style={{
              background: isSandbox ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
              color: isSandbox ? '#f59e0b' : '#10b981',
              border: isSandbox ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(16,185,129,0.25)',
            }}
            title="Toggle Sandbox/Live Mode"
          >
            <span
              className="w-1.5 h-1.5 rounded-full ambient-pulse"
              style={{ background: isSandbox ? '#f59e0b' : '#10b981' }}
            />
            <span className="hidden sm:inline">{isSandbox ? 'Sandbox' : 'Live'}</span>
          </button>

          {/* 4. Vault Balance */}
          <button
            className="hidden lg:flex flex-col items-end px-3 py-1.5 rounded-xl transition-all"
            onMouseEnter={() => setVaultHover(true)}
            onMouseLeave={() => setVaultHover(false)}
            style={{
              background: vaultHover ? 'var(--color-surface-container-high)' : 'var(--color-surface-container-low)',
              border: '1px solid var(--card-border)',
              boxShadow: vaultHover ? '0 0 12px var(--glow-primary)' : 'none',
              transition: 'all 0.25s ease',
            }}
            title="Vault Balance"
          >
            <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--color-on-surface-variant)' }}>
              Vault
            </span>
            <span className="text-[13px] font-bold tabular-nums metric-value" style={{ color: 'var(--color-primary)' }}>
              ${vaultBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </button>

          {/* 5. Profile Avatar */}
          <button
            aria-label="Profile"
            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all hover:ring-2"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-secondary))',
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-white text-[17px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
