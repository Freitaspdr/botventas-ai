'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const PERIODS = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
];

export function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('p') ?? 'today';

  function select(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('p', key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1.5 rounded-[20px] p-1.5"
      style={{
        background: 'rgba(248,239,224,0.82)',
        border: '1px solid rgba(218,197,160,0.68)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.74)',
      }}
    >
      {PERIODS.map((period) => {
        const isActive = period.key === current;

        return (
          <button
            key={period.key}
            onClick={() => select(period.key)}
            className="rounded-[14px] px-3.5 py-2 text-[11px] font-semibold transition-all"
            style={{
              background: isActive
                ? 'linear-gradient(135deg, #d7ac55, #9b6a24)'
                : 'transparent',
              color: isActive ? '#fffaf0' : '#8a785d',
              border: isActive ? '1px solid rgba(151,102,31,0.22)' : '1px solid transparent',
              boxShadow: isActive ? '0 10px 24px rgba(151,102,31,0.16), inset 0 1px 0 rgba(255,255,255,0.24)' : 'none',
            }}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
