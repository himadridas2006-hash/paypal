import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  templates?: React.ReactNode;
  accent?: 'primary' | 'secondary' | 'tertiary' | 'error';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  templates,
  accent = 'primary',
}) => {
  const accentClasses = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    secondary: 'text-secondary bg-secondary/10 border-secondary/20',
    tertiary: 'text-tertiary bg-tertiary/10 border-tertiary/20',
    error: 'text-error bg-error/10 border-error/20',
  }[accent];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col items-center text-center max-w-xl mx-auto space-y-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${accentClasses} shadow-sm`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>

      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base md:text-lg font-bold text-on-surface tracking-tight">
          {title}
        </h3>
        <p className="text-xs md:text-body-sm text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <span>{actionLabel}</span>
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold border border-outline-variant/30 transition-all active:scale-95"
            >
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}

      {templates && <div className="w-full pt-4 border-t border-outline-variant/20">{templates}</div>}
    </div>
  );
};

export interface TemplateCardProps {
  title: string;
  tag: string;
  monthlyCap: number;
  perTxCap: number;
  merchants: string[];
  description: string;
  icon: string;
  onApply: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  title,
  tag,
  monthlyCap,
  perTxCap,
  merchants,
  description,
  icon,
  onApply,
}) => {
  return (
    <div className="bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-primary/40 rounded-xl p-4 text-left transition-all flex flex-col justify-between group shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                {title}
              </h4>
              <span className="text-[10px] text-on-surface-variant font-mono">{tag}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-mono font-bold text-on-surface">
            ${monthlyCap}/mo
          </span>
        </div>

        <p className="text-[11px] text-on-surface-variant line-clamp-2 mb-3">
          {description}
        </p>

        <div className="space-y-1 mb-3 text-[10px]">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Per-Tx Cap:</span>
            <span className="font-mono font-semibold text-on-surface">${perTxCap}</span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Merchants:</span>
            <span className="font-mono text-on-surface truncate max-w-[140px]">
              {merchants.join(', ')}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onApply}
        className="w-full py-1.5 px-3 rounded-lg bg-surface-container-lowest hover:bg-primary hover:text-on-primary text-on-surface text-[11px] font-semibold border border-outline-variant/30 group-hover:border-primary transition-all flex items-center justify-center gap-1.5"
      >
        <span>Use This Template</span>
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </button>
    </div>
  );
};
