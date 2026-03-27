'use client';

import { useSidebar } from './sidebar-context';
import { Menu, X } from 'lucide-react';

export function SidebarToggle() {
  const { open, toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
      title={open ? 'Cerrar menú' : 'Abrir menú'}
    >
      {open
        ? <X size={15} className="text-[#a1a1aa]" strokeWidth={1.5} />
        : <Menu size={15} className="text-[#a1a1aa]" strokeWidth={1.5} />
      }
    </button>
  );
}
