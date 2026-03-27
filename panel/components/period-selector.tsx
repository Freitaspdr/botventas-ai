'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const PERIODS = [
  { key: '7d',    label: '7d' },
  { key: 'today', label: 'Hoy' },
  { key: '30d',   label: '30d' },
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
      className="flex items-center rounded-lg overflow-hidden text-[11px]"
      style={{ border: '0.5px solid rgba(255,255,255,0.05)' }}
    >
      {PERIODS.map((p, i) => {
        const isActive = p.key === current;
        return (
          <button
            key={p.key}
            onClick={() => select(p.key)}
            className="px-3 py-1.5 transition-colors"
            style={{
              background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: isActive ? '#fafafa' : '#a1a1aa',
              borderRight: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : undefined,
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
