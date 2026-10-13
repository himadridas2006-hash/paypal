import React from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 120,
  strokeWidth = 14,
  centerLabel,
  centerValue,
}) => {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedAngle = -90; // Start at top (12 o'clock)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-surface-container-high)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, idx) => {
          const ratio = seg.value / total;
          const strokeDasharray = `${ratio * circumference} ${circumference}`;
          const strokeDashoffset = -((accumulatedAngle + 90) / 360) * circumference;
          accumulatedAngle += ratio * 360;

          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
          {centerValue && (
            <span className="text-xs md:text-sm font-extrabold text-on-surface font-mono leading-none">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-on-surface-variant font-medium mt-0.5 truncate max-w-[80%]">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
