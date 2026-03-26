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
} from 'lucide-react';

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
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  dot?: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={label}
      className={`
        relative flex items-center justify-center w-9 h-9 rounded-[10px] transition-colors
        ${isActive
          ? 'bg-green-500/10'
          : 'hover:bg-white/[0.04]'}
      `}
    >
      <Icon
        size={16}
        className={isActive ? 'text-[#4ade80]' : 'text-[#a1a1aa]'}
        strokeWidth={1.5}
      />
      {dot && !isActive && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
      )}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-11 bottom-0 z-30 flex flex-col items-center py-2 gap-0.5"
      style={{ width: 56, borderRight: '0.5px solid rgba(255,255,255,0.05)' }}
    >
      {/* Nav principal */}
      <nav className="flex flex-col items-center gap-0.5 flex-1 w-full px-2.5 pt-2">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Separador + Config */}
      <div className="flex flex-col items-center gap-0.5 w-full px-2.5 pb-2">
        <div
          className="w-7 mb-1"
          style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }}
        />
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    </aside>
  );
}
