'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ViewTab } from '@/types';

interface BottomNavProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  pendingApprovalsCount: number;
}

const NAV_ITEMS: { tab: ViewTab; label: string; icon: string; iconFilled?: string }[] = [
  { tab: 'command',   label: 'Command',   icon: 'dashboard',   iconFilled: 'dashboard' },
  { tab: 'mandates',  label: 'Mandates',  icon: 'shield',      iconFilled: 'shield' },
  { tab: 'approvals', label: 'Approvals', icon: 'task_alt',    iconFilled: 'task_alt' },
  { tab: 'fairshare', label: 'FairShare', icon: 'group_work',  iconFilled: 'group_work' },
  { tab: 'tools',     label: 'Tools',     icon: 'widgets',     iconFilled: 'widgets' },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
}) => {
  const [prevTab, setPrevTab] = useState(currentTab);
  const [animKey, setAnimKey] = useState(0);

  const handleSelect = (tab: ViewTab) => {
    if (tab === currentTab) return;
    setPrevTab(currentTab);
    setAnimKey((k) => k + 1);
    onSelectTab(tab);
  };

  return (
    <nav
      className="fixed bottom-0 w-full z-50 pb-safe transition-colors duration-300"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        borderTop: '1px solid var(--card-border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.tab;
          const hasBadge = item.tab === 'approvals' && pendingApprovalsCount > 0;

          return (
            <button
              key={item.tab}
              onClick={() => handleSelect(item.tab)}
              className="relative flex flex-col items-center justify-center gap-0.5 w-[60px] h-[52px] rounded-2xl transition-all duration-200"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                background: isActive ? 'var(--color-surface-container-high)' : 'transparent',
                boxShadow: isActive ? '0 0 0 1px var(--card-border), 0 0 16px var(--glow-primary)' : 'none',
              }}
              aria-label={item.label}
            >
              {/* Icon + badge */}
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined transition-all duration-200 ${isActive ? 'nav-active-pop' : ''}`}
                  key={isActive ? `${item.tab}-active-${animKey}` : item.tab}
                  style={{
                    fontSize: isActive ? '22px' : '21px',
                    fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                  }}
                >
                  {item.icon}
                </span>

                {hasBadge && (
                  <span
                    className="absolute -top-1 -right-2 text-[9px] font-black leading-none text-white rounded-full flex items-center justify-center"
                    style={{
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 3px',
                      background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-secondary))',
                      boxShadow: '0 2px 6px var(--glow-primary)',
                    }}
                  >
                    {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className="text-[10px] font-semibold leading-none transition-all"
                style={{ opacity: isActive ? 1 : 0.65, letterSpacing: isActive ? '-0.01em' : '0' }}
              >
                {item.label}
              </span>

              {/* Active dot */}
              {isActive && (
                <span
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--color-primary)', boxShadow: '0 0 6px var(--glow-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
