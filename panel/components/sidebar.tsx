'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  MessageCircle,
  Users,
  CalendarDays,
  TrendingUp,
  Settings2,
  Shield,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';

const NAV_ITEMS = [
  { href: '/',               icon: LayoutGrid,   label: 'Dashboard' },
  { href: '/conversaciones', icon: MessageCircle, label: 'Conversaciones' },
  { href: '/leads',          icon: Users,         label: 'Leads',         dot: true },
  { href: '/citas',          icon: CalendarDays,  label: 'Citas' },
  { href: '/analytics',      icon: TrendingUp,    label: 'Analytics' },
];

const BOTTOM_ITEMS = [
  { href: '/configuracion',  icon: Settings2,     label: 'Configuración' },
];

function NavItem({
  href,
  icon: Icon,
  label,
  dot,
  expanded,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  dot?: boolean;
  expanded: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      className={`
        relative flex items-center gap-2.5 rounded-[10px] transition-all duration-200
        ${expanded ? 'w-full px-2.5 py-2' : 'w-9 h-9 justify-center'}
        ${isActive ? 'bg-green-500/10' : 'hover:bg-white/[0.04]'}
      `}
    >
      <Icon
        size={16}
        className={`flex-shrink-0 ${isActive ? 'text-[#4ade80]' : 'text-[#a1a1aa]'}`}
        strokeWidth={1.5}
      />
      {expanded && (
        <span
          className="text-[12px] truncate"
          style={{ color: isActive ? '#e4e4e7' : '#a1a1aa' }}
        >
          {label}
        </span>
      )}
      {dot && !isActive && (
        <span className={`absolute w-1.5 h-1.5 rounded-full bg-[#22c55e] ${expanded ? 'right-2.5 top-1/2 -translate-y-1/2' : 'top-1.5 right-1.5'}`} />
      )}
    </Link>
  );
}

export function Sidebar({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const { open } = useSidebar();

  return (
    <>
      {/* Backdrop when open */}
      {open && (
        <div
          className="fixed inset-0 z-20"
          style={{ top: 44 }}
        />
      )}

      <aside
        className="fixed left-0 top-11 bottom-0 z-30 flex flex-col py-2 gap-0.5 transition-all duration-200"
        style={{
          width: open ? 200 : 56,
          borderRight: '0.5px solid rgba(255,255,255,0.05)',
          background: '#09090b',
          overflow: 'hidden',
        }}
      >
        {/* Nav principal */}
        <nav className={`flex flex-col gap-0.5 flex-1 w-full pt-2 ${open ? 'px-2' : 'items-center px-2.5'}`}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} expanded={open} />
          ))}
          {isSuperAdmin && (
            <NavItem href="/admin" icon={Shield} label="Admin" expanded={open} />
          )}
        </nav>

        {/* Separador + Config */}
        <div className={`flex flex-col gap-0.5 w-full pb-2 ${open ? 'px-2' : 'items-center px-2.5'}`}>
          <div
            className="mb-1"
            style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)', margin: open ? '0 8px 4px' : '0 auto 4px', width: open ? 'calc(100% - 16px)' : 28 }}
          />
          {BOTTOM_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} expanded={open} />
          ))}
        </div>
      </aside>
    </>
  );
}
