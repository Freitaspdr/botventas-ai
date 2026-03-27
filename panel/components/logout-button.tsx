'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
      title="Cerrar sesión"
    >
      <LogOut size={14} className="text-[#a1a1aa]" strokeWidth={1.5} />
    </button>
  );
}
