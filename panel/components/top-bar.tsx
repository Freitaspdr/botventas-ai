import { auth } from '@/lib/auth';
import supabase from '@/lib/db';
import { Bell, Search, ShieldCheck } from 'lucide-react';
import { LogoutButton } from './logout-button';
import { SidebarToggle } from './sidebar-toggle';

async function getEmpresaNombre(empresaId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('empresas')
      .select('nombre')
      .eq('id', empresaId)
      .single();
    return data?.nombre ?? 'Mi empresa';
  } catch {
    return 'Mi empresa';
  }
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatToday() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export async function TopBar() {
  const session = await auth();
  const empresaNombre = session?.user?.empresaId
    ? await getEmpresaNombre(session.user.empresaId)
    : 'BotVentas AI';

  const initials = getInitials(session?.user?.name);
  const isSuperAdmin = (session?.user as { rol?: string })?.rol === 'superadmin';

  return (
    <header className="fixed left-0 right-0 top-0 z-40 px-5 pt-5">
      <div
        className="mx-auto flex max-w-[1520px] items-center justify-between rounded-[28px] px-4 py-3 md:px-5"
        style={{
          background: 'rgba(255,253,248,0.88)',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 18px 46px rgba(116,82,28,0.12), inset 0 1px 0 rgba(255,255,255,0.85)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex items-center gap-4">
          <SidebarToggle />
          <div className="hidden items-center gap-3 md:flex">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[16px]"
              style={{
                background: 'linear-gradient(135deg, #d7ac55, #9b6a24)',
                boxShadow: '0 10px 24px rgba(151,102,31,0.18), inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              <ShieldCheck size={19} strokeWidth={1.9} style={{ color: '#fffaf0' }} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#9a8153' }}>
                {formatToday()}
              </p>
              <p className="text-[15px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
                {empresaNombre}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden flex-1 justify-center px-8 lg:flex">
          <div
            className="flex w-full max-w-[520px] items-center gap-3 rounded-[18px] px-4 py-3"
            style={{
              background: 'rgba(248,239,224,0.72)',
              border: '1px solid rgba(218,197,160,0.62)',
            }}
          >
            <Search size={15} strokeWidth={1.8} style={{ color: '#8a785d' }} />
            <span className="text-[12px]" style={{ color: '#8a785d' }}>
              Inbox, CRM y WhatsApp API listos para integrar
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <span
              className="hidden rounded-full px-3 py-1 text-[11px] font-medium md:inline-flex"
              style={{
                background: 'rgba(184,134,47,0.12)',
                color: '#8a5d1a',
                border: '1px solid rgba(184,134,47,0.22)',
              }}
            >
              Superadmin
            </span>
          )}
          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-[16px] transition-colors"
            style={{
              background: 'rgba(248,239,224,0.72)',
              border: '1px solid rgba(218,197,160,0.62)',
            }}
            title="Notificaciones"
          >
            <Bell size={16} strokeWidth={1.7} className="text-[#7a6548]" />
            <span
              className="absolute right-3 top-3 h-2 w-2 rounded-full"
              style={{ background: '#b8862f', boxShadow: '0 0 10px rgba(184,134,47,0.55)' }}
            />
          </button>
          <div
            className="flex items-center gap-3 rounded-[18px] px-2.5 py-2"
            style={{
              background: 'rgba(248,239,224,0.72)',
              border: '1px solid rgba(218,197,160,0.62)',
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[14px] text-[11px] font-semibold"
              style={{
                background: 'linear-gradient(135deg, #b8862f, #79521d)',
                color: '#fffaf0',
              }}
              title={session?.user?.name ?? 'Usuario'}
            >
              {initials}
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-[12px] font-medium" style={{ color: '#2c2418' }}>
                {session?.user?.name ?? 'Usuario'}
              </p>
              <p className="truncate text-[11px]" style={{ color: '#8a785d' }}>
                {session?.user?.email ?? 'Acceso interno'}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
