import Link from 'next/link';

interface SectionCardProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function SectionCard({
  title,
  viewAllHref,
  viewAllLabel = 'Ver todo →',
  children,
  headerRight,
}: SectionCardProps) {
  return (
    <div className="panel-surface flex flex-col overflow-hidden rounded-[28px]">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(218,197,160,0.58)' }}
      >
        <div>
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="rounded-full px-3 py-1.5 text-[11px] transition-colors hover:bg-[#f3e5ce]"
              style={{
                color: '#79521d',
                background: 'rgba(248,239,224,0.72)',
                border: '1px solid rgba(218,197,160,0.62)',
              }}
            >
              {viewAllLabel}
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
