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
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-[13px]" style={{ color: '#a1a1aa' }}>
          {title}
        </span>
        <div className="flex items-center gap-2">
          {headerRight}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[11px] transition-colors hover:text-[#a1a1aa]"
              style={{ color: '#71717a' }}
            >
              {viewAllLabel}
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
