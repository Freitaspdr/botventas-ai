'use client';

import { createContext, useContext, useState } from 'react';

interface SidebarCtx {
  open: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarCtx>({ open: true, toggle: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('botventas:sidebar') !== '0';
  });

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem('botventas:sidebar', next ? '1' : '0');
      return next;
    });
  }

  return (
    <SidebarContext.Provider value={{ open, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
