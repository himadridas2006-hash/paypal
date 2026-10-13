import React from 'react';

export interface StatTileProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  accent?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'warning';
  sparklineData?: number[];
  tooltip?: string;
}

export const Sparkline: React.FC<{
  data: number[];
  accent?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'warning';
  height?: number;
  width?: number;
}> = ({ data, accent = 'primary', height = 28, width = 64 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const chartHeight = height - padding * 2;
  const step = (width - padding * 2) / (data.length - 1);

  const points = data
    .map((val, idx) => {
      const x = padding + idx * step;
      const y = height - padding - ((val - min) / range) * chartHeight;
      return x.toFixed(1) + ',' + y.toFixed(1);
    })
    .join(' ');

  const strokeColor = {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    tertiary: 'var(--color-tertiary)',
    error: 'var(--color-error)',
    warning: '#f59e0b',
  }[accent];

  return (
    <svg width={width} height={height} className="overflow-visible" viewBox={'0 0 ' + width + ' ' + height}>
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  subValue,
  change,
  trend = 'neutral',
  icon,
  accent = 'primary',
  sparklineData,
}) => {
  const accentClasses = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    secondary: 'text-secondary bg-secondary/10 border-secondary/20',
    tertiary: 'text-tertiary bg-tertiary/10 border-tertiary/20',
    error: 'text-error bg-error/10 border-error/20',
    warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  }[accent];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3.5 md:p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] md:text-xs font-semibold text-on-surface-variant uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <div className={'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ' + accentClasses}>
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl md:text-2xl font-extrabold text-on-surface font-mono tracking-tight truncate">
            {value}
          </div>
          {subValue && (
            <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{subValue}</p>
          )}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="w-16 h-7 shrink-0 flex items-center justify-end">
            <Sparkline data={sparklineData} accent={accent} />
          </div>
        )}
      </div>

      {change && (
        <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center gap-1.5 text-[11px]">
          <span
            className={'font-semibold ' + (
              trend === 'up'
                ? 'text-tertiary'
                : trend === 'down'
                ? 'text-error'
                : 'text-on-surface-variant'
            )}
          >
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '•'} {change}
          </span>
          <span className="text-on-surface-variant/70 text-[10px]">vs last cycle</span>
        </div>
      )}
    </div>
  );
};
