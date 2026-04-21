'use client';

import { useSidebar } from './sidebar-context';
import { Menu, X } from 'lucide-react';

export function SidebarToggle() {
  const { open, toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-[16px] transition-colors hover:bg-[#f3e5ce]"
      title={open ? 'Cerrar menú' : 'Abrir menú'}
      style={{
        background: 'rgba(255,253,248,0.86)',
        border: '1px solid rgba(218,197,160,0.72)',
        color: '#6f5632',
      }}
    >
      {open
        ? <X size={16} strokeWidth={1.8} />
        : <Menu size={16} strokeWidth={1.8} />
      }
    </button>
  );
}
