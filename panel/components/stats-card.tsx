interface StatsCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
  trend?: { value: number; label?: string };
  icon?: React.ReactNode;
}

export function StatsCard({ label, value, color = '#fafafa', subtext, trend, icon }: StatsCardProps) {
  const trendPositive = trend && trend.value >= 0;

  return (
    <div
      className="rounded-[10px] p-3 flex flex-col gap-2"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between">
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: '#71717a' }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: '#71717a' }}>
            {icon}
          </span>
        )}
      </div>

      {/* Number */}
      <span
        className="text-2xl font-medium tracking-tight leading-none"
        style={{ color }}
      >
        {value}
      </span>

      {/* Bottom: subtext + trend */}
      <div className="flex items-center justify-between">
        {subtext && (
          <span className="text-[11px]" style={{ color: '#a1a1aa' }}>
            {subtext}
          </span>
        )}
        {trend && (
          <span
            className="flex items-center gap-0.5 text-[10px] ml-auto"
            style={{ color: trendPositive ? '#4ade80' : '#f87171' }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              {trendPositive ? (
                <path d="M4 6.5V1.5M4 1.5L1.5 4M4 1.5L6.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 1.5V6.5M4 6.5L1.5 4M4 6.5L6.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {trend.value > 0 ? '+' : ''}{trend.value}{trend.label ?? '%'}
          </span>
        )}
      </div>
    </div>
  );
}
