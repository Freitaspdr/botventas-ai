interface StatsCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
  trend?: { value: number; label?: string };
  icon?: React.ReactNode;
}

export function StatsCard({ label, value, color = '#b8862f', subtext, trend, icon }: StatsCardProps) {
  const trendPositive = trend && trend.value >= 0;

  return (
    <div className="panel-surface flex h-full flex-col gap-5 rounded-[26px] p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <span className="panel-label text-[11px]">{label}</span>
        </div>
        {icon && (
          <span
            className="flex h-11 w-11 items-center justify-center rounded-[18px]"
            style={{
              color: '#8a5d1a',
              background: 'linear-gradient(135deg, rgba(216,172,85,0.2), rgba(255,253,248,0.84))',
              border: '1px solid rgba(218,197,160,0.72)',
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <span className="text-[2.35rem] font-semibold leading-none tracking-[-0.05em]" style={{ color }}>
          {value}
        </span>
        {trend && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px]"
            style={{
              color: trendPositive ? '#3f744d' : '#a33b36',
              background: trendPositive ? 'rgba(79,139,95,0.12)' : 'rgba(194,65,60,0.12)',
              border: trendPositive ? '1px solid rgba(79,139,95,0.18)' : '1px solid rgba(194,65,60,0.16)',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              {trendPositive ? (
                <path d="M4 6.5V1.5M4 1.5L1.5 4M4 1.5L6.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 1.5V6.5M4 6.5L1.5 4M4 6.5L6.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {trend.value > 0 ? '+' : ''}
            {trend.value}
            {trend.label ?? '%'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {subtext ? (
          <span className="text-[12px] leading-5" style={{ color: '#8a785d' }}>
            {subtext}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
