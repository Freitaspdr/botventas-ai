'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="relative flex h-9 w-9 items-center justify-center rounded-[14px] transition-colors hover:bg-[#f3e5ce]"
      title="Cerrar sesión"
      style={{ color: '#7a6548' }}
    >
      <LogOut size={15} strokeWidth={1.7} />
    </button>
  );
}
