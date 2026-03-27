import { auth } from '@/lib/auth';
import pool from '@/lib/pool';
import { Bell } from 'lucide-react';
import { LogoutButton } from './logout-button';

async function getEmpresaNombre(empresaId: string): Promise<string> {
  try {
    const { rows } = await pool.query<{ nombre: string }>(
      'SELECT nombre FROM empresas WHERE id = $1',
      [empresaId],
    );
    return rows[0]?.nombre ?? 'Mi empresa';
  } catch {
    return 'Mi empresa';
  }
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export async function TopBar() {
  const session = await auth();
  const empresaNombre = session?.user?.empresaId
    ? await getEmpresaNombre(session.user.empresaId)
    : 'BotVentas AI';

  const initials = getInitials(session?.user?.name);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: 44,
        background: 'rgba(255,255,255,0.015)',
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Izquierda: logo + empresa */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="#22c55e" strokeWidth="1" />
            <path
              d="M5.5 9L7.5 11L12.5 6.5"
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[14px] font-medium text-[#fafafa] tracking-tight">
            BotVentas
          </span>
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}
          >
            AI
          </span>
        </div>

        {/* Separador + empresa */}
        <div
          className="self-stretch"
          style={{ width: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '10px 0' }}
        />
        <span className="text-[12px] text-[#a1a1aa]">{empresaNombre}</span>
      </div>

      {/* Derecha: campana + avatar */}
      <div className="flex items-center gap-3">
        {/* Campana */}
        <button
          className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
          title="Notificaciones"
        >
          <Bell size={14} className="text-[#a1a1aa]" strokeWidth={1.5} />
          {/* Punto rojo — siempre visible por ahora */}
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{ background: '#ef4444' }}
          />
        </button>

        {/* Avatar */}
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-medium select-none"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            color: '#a5b4fc',
          }}
          title={session?.user?.name ?? 'Usuario'}
        >
          {initials}
        </div>

        {/* Logout */}
        <LogoutButton />
      </div>
    </header>
  );
}
