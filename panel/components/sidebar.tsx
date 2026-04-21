'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookUser,
  CalendarDays,
  LayoutGrid,
  MessageCircle,
  Settings2,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';

const NAV_ITEMS = [
  { href: '/', icon: LayoutGrid, label: 'Dashboard', hint: 'Vista operativa' },
  { href: '/contactos', icon: BookUser, label: 'Contactos', hint: 'CRM reusable' },
  { href: '/conversaciones', icon: MessageCircle, label: 'Conversaciones', hint: 'Inbox e historial' },
  { href: '/leads', icon: Users, label: 'Leads', hint: 'Pipeline comercial' },
  { href: '/citas', icon: CalendarDays, label: 'Citas', hint: 'Agenda operativa' },
  { href: '/analytics', icon: TrendingUp, label: 'Analytics', hint: 'Rendimiento y conversión' },
];

const BOTTOM_ITEMS = [
  { href: '/configuracion', icon: Settings2, label: 'Configuración', hint: 'Bot y API CRM' },
];

function NavItem({
  href,
  icon: Icon,
  label,
  hint,
  expanded,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  hint: string;
  expanded: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={expanded ? undefined : label}
      className={`group relative flex items-center gap-3 rounded-[18px] transition-all duration-200 ${
        expanded ? 'px-3 py-3' : 'h-12 w-12 justify-center'
      }`}
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(184,134,47,0.16), rgba(255,250,240,0.92))'
          : 'transparent',
        border: isActive ? '1px solid rgba(184,134,47,0.28)' : '1px solid transparent',
        boxShadow: isActive ? '0 12px 26px rgba(116,82,28,0.08), inset 0 1px 0 rgba(255,255,255,0.82)' : 'none',
      }}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] transition-colors"
        style={{
          background: isActive ? 'linear-gradient(135deg, #d7ac55, #9b6a24)' : 'rgba(245,234,216,0.78)',
          color: isActive ? '#fffaf0' : '#8a785d',
        }}
      >
        <Icon size={17} strokeWidth={1.6} />
      </span>
      {expanded && (
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium" style={{ color: isActive ? '#2c2418' : '#5f513e' }}>
            {label}
          </span>
          <span className="block truncate text-[11px]" style={{ color: isActive ? '#8a6b32' : '#9a8a72' }}>
            {hint}
          </span>
        </span>
      )}
      {!expanded && isActive && (
        <span
          className="absolute -right-1 h-8 w-1 rounded-full"
          style={{ background: 'linear-gradient(180deg, #d7ac55, #9b6a24)' }}
        />
      )}
      {!isActive && (
        <span
          className="absolute inset-0 rounded-[18px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: 'rgba(243,229,206,0.52)' }}
        />
      )}
    </Link>
  );
}

export function Sidebar({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const { open } = useSidebar();

  return (
    <aside
      className={`sidebar-scroll fixed bottom-5 left-4 top-[96px] z-30 flex-col justify-between overflow-y-auto overflow-x-hidden overscroll-contain rounded-[28px] p-3 transition-all duration-200 md:top-[118px] ${open ? 'flex' : 'hidden md:flex'}`}
      style={{
        width: open ? 270 : 78,
        background: 'rgba(255,250,242,0.92)',
        border: '1px solid rgba(218,197,160,0.72)',
        boxShadow: '0 22px 54px rgba(116,82,28,0.14), inset 0 1px 0 rgba(255,255,255,0.86)',
        backdropFilter: 'blur(18px)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex flex-col gap-4">
        <div
          className={`rounded-[22px] px-3 py-4 ${open ? '' : 'flex justify-center py-3'}`}
          style={{
            background: 'linear-gradient(135deg, rgba(255,253,248,0.96), rgba(234,213,173,0.62))',
            border: '1px solid rgba(218,197,160,0.72)',
          }}
        >
          {open ? (
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-[16px]"
                style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0' }}
              >
                <Sparkles size={18} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#9a8153' }}>
                  BotVentas AI
                </p>
                <p className="mt-1 text-[18px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
                  CRM Studio
                </p>
                <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>
                  Inbox, leads, agenda y API en una sola capa.
                </p>
              </div>
            </div>
          ) : (
            <span
              className="flex h-11 w-11 items-center justify-center rounded-[16px]"
              style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0' }}
            >
              <Sparkles size={18} strokeWidth={1.8} />
            </span>
          )}
        </div>

        <nav className={`flex flex-col gap-2 ${open ? '' : 'items-center'}`}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} expanded={open} />
          ))}
          {isSuperAdmin && (
            <NavItem href="/admin" icon={Shield} label="Admin" hint="Empresas y accesos" expanded={open} />
          )}
        </nav>
      </div>

      <div
        className={`rounded-[22px] p-3 ${open ? '' : 'flex justify-center p-2.5'}`}
        style={{
          background: 'rgba(248,239,224,0.62)',
          border: '1px solid rgba(218,197,160,0.58)',
        }}
      >
        <div className={`flex flex-col gap-2 ${open ? '' : 'items-center'}`}>
          {BOTTOM_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} expanded={open} />
          ))}
          {open && (
            <p className="px-2 pt-2 text-[10px] leading-5" style={{ color: '#9a8a72' }}>
              El token CRM y la instancia de WhatsApp deben estar alineados antes de integrar otro frontend.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
